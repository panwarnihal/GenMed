"""
==============================================================================
  GenMed — OCR & NER Invoice Scanner Router
  File  : app/routes/scanner.py
  Route : POST /api/v1/scanner/upload
          POST /api/v1/scanner/manual

  Pipeline:
    [Pharmacy Bill Image / Manual Input]
         |
         v
    [Gemini 1.5 Flash Vision / Manual Line Items]
         |
         v
    [Pydantic validation + sanitisation]
         |
         v
    [Mapping, Regulatory, DDI Audit Pipeline]
         |
         v
    [FinalAuditReport JSON response]
==============================================================================
"""

import os
import json
import re
import base64
import logging
from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field, field_validator

from app.routes.mapping import match_generic_alternative, MappingRequest
from app.services.regulatory_service import check_regulatory_status
from app.services.ddi_service import check_batch_interactions, build_ddi_summary
from utils_hasher import generate_canonical_salt_key

# ─────────────────────────────────────────────────────────────────────────────
# LOGGER
# ─────────────────────────────────────────────────────────────────────────────
logger = logging.getLogger("genmed.scanner")

# ─────────────────────────────────────────────────────────────────────────────
# ROUTER
# ─────────────────────────────────────────────────────────────────────────────
router = APIRouter(
    prefix="/api/v1/scanner",
    tags=["Invoice Scanner — OCR & NER"],
)

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
}
MAX_IMAGE_BYTES = 10 * 1024 * 1024   # 10 MB hard cap
GEMINI_MODEL   = "gemini-1.5-flash"  # fast & cost-effective


# ─────────────────────────────────────────────────────────────────────────────
# PYDANTIC SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class ExtractedLineItem(BaseModel):
    """A single medicine row parsed from an Indian pharmacy / chemist bill."""

    brand_name: str = Field(
        ...,
        description="Branded drug name printed on the bill. Exclude batch numbers or dates.",
        examples=["AUGMENTIN 625 DUO TAB", "PANTOP 40"],
    )
    extracted_salt: Optional[str] = Field(
        None,
        description="Active chemical ingredients if printed on the bill/strip.",
        examples=["Amoxicillin 500mg + Clavulanic Acid 125mg"],
    )
    quantity_units: int = Field(
        ...,
        ge=1,
        description="Number of tablets/bottles billed.",
        examples=[10],
    )
    batch_number: Optional[str] = Field(
        None,
        description="Alphanumeric batch/lot code printed on strip or packaging.",
        examples=["C2381"],
    )
    printed_mrp: float = Field(
        ...,
        ge=0,
        description="Maximum Retail Price listed per pack/item on the label.",
        examples=[223.40],
    )
    paid_price: float = Field(
        ...,
        ge=0,
        description="Actual amount charged to the customer for this line item.",
        examples=[223.40],
    )
    dpco_ceiling_price: Optional[float] = Field(
        None,
        ge=0,
        description=(
            "NPPA / DPCO Schedule-II statutory ceiling price per unit (pre-GST). "
            "Populated only when the drug is under price control."
        ),
    )

    @field_validator("brand_name", mode="before")
    @classmethod
    def sanitise_brand_name(cls, v: str) -> str:
        return str(v).strip().upper()

    @field_validator("extracted_salt", "batch_number", mode="before")
    @classmethod
    def sanitise_optional_str(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = str(v).strip()
        return cleaned if cleaned else None


class InvoiceScanResult(BaseModel):
    """Top-level container returned by the OCR / NER pipeline."""

    invoice_id: str = Field(
        ...,
        description="Invoice / bill number extracted from the document.",
        examples=["INV-2026-88914"],
    )
    chemist_name: Optional[str] = Field(
        None,
        description="Pharmacy / chemist store name if legible on the bill header.",
    )
    line_items: List[ExtractedLineItem] = Field(
        ...,
        min_length=1,
        description="Ordered list of medicine line items extracted from the bill.",
    )

    @field_validator("invoice_id", mode="before")
    @classmethod
    def sanitise_invoice_id(cls, v: str) -> str:
        cleaned = str(v).strip()
        if not cleaned:
            raise ValueError("invoice_id must not be empty")
        return cleaned


class ManualLineItem(BaseModel):
    brand_name: str = Field(..., description="Brand name of the medicine")
    paid_price: float = Field(..., ge=0, description="Price paid for the medicine")
    printed_mrp: Optional[float] = Field(None, ge=0, description="Printed MRP if known")
    quantity_units: Optional[int] = Field(1, ge=1, description="Quantity of units")
    extracted_salt: Optional[str] = Field(None, description="Chemical composition if known")


class ManualAuditRequest(BaseModel):
    line_items: List[ManualLineItem] = Field(..., min_length=1)


class AuditResult(BaseModel):
    is_overcharged: bool
    overcharge_amount: float
    jan_aushadhi_alternative: Optional[str] = None
    jan_aushadhi_price: Optional[float] = None
    potential_savings: float


class RegulatoryStatus(BaseModel):
    status: str
    is_banned: bool
    warning_message: Optional[str] = None


class AuditedLineItem(BaseModel):
    brand_name: str
    quantity_units: int
    printed_mrp: float
    paid_price: float
    audit_summary: AuditResult
    regulatory_summary: RegulatoryStatus
    requires_pharmacist_verification: bool = False


class FinalAuditReport(BaseModel):
    invoice_id: str
    total_paid: float
    total_overcharge: float
    total_potential_savings: float
    audited_items: List[AuditedLineItem]
    ddi_summary: dict


# ─────────────────────────────────────────────────────────────────────────────
# GEMINI VISION — EXTRACTION ENGINE
# ─────────────────────────────────────────────────────────────────────────────
_EXTRACTION_PROMPT = """
You are an expert Indian pharmaceutical billing analyst specialising in OCR and
Named Entity Recognition (NER). You will be given an image of an Indian pharmacy
/ chemist retail bill or medicine strip photograph.

Your task is to extract EVERY medicine line item from the bill and return a single
valid JSON object with the following structure — no markdown fences, no prose,
ONLY the JSON object:

{
  "invoice_id": "<invoice or bill number — use 'UNKNOWN' if not present>",
  "chemist_name": "<store name from header — null if not legible>",
  "line_items": [
    {
      "brand_name": "<exact branded name as printed, UPPERCASE, no batch/date>",
      "extracted_salt": "<active ingredient composition if printed, else null>",
      "quantity_units": <integer count of tablets/bottles, default 1>,
      "batch_number": "<alphanumeric batch/lot code, null if absent>",
      "printed_mrp": <MRP per pack as a float, 0.0 if not visible>,
      "paid_price": <amount billed for this line as a float>,
      "dpco_ceiling_price": <NPPA/DPCO per-unit ceiling in Rs (pre-GST) if shown, else null>
    }
  ]
}

Rules you MUST follow:
1. Include EVERY line item — do not skip any medicine, even partial entries.
2. brand_name must be UPPERCASE and contain only the product name (e.g. "CALPOL 500",
   not "CALPOL 500 Mfg: Dec-23 Exp: Dec-25 Batch: XY90").
3. If a price column is ambiguous, prefer the column closest to "Amt" or "Amount" for
   paid_price and the column labelled "MRP" for printed_mrp.
4. quantity_units must be a positive integer. If the bill shows "1 × 10 strip", use 10.
5. Return exactly one top-level JSON object — never an array at root level.
6. Do NOT hallucinate drugs not present in the image. Only report what you can read.
7. If the image is completely unreadable or is not a pharmacy bill, return:
   {"invoice_id": "UNREADABLE", "chemist_name": null, "line_items": []}
""".strip()


def _build_gemini_client():
    try:
        from google import genai  # type: ignore[import]
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="google-genai SDK is not installed. Run: pip install google-genai",
        )

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY environment variable is not set. Add it to backend/.env and restart the server.",
        )

    return genai.Client(api_key=api_key)


def _extract_json_block(raw: str) -> str:
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fence_match:
        return fence_match.group(1)

    start = raw.find("{")
    if start == -1:
        raise ValueError("No JSON object found in model response")

    depth = 0
    for i, ch in enumerate(raw[start:], start=start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return raw[start : i + 1]

    raise ValueError("Malformed JSON in model response — unmatched braces")


def _call_gemini_vision(image_bytes: bytes, mime_type: str) -> dict:
    from google import genai  # type: ignore[import]
    from google.genai import types as genai_types  # type: ignore[import]

    client = _build_gemini_client()

    try:
        logger.info(
            "Calling Gemini Vision | model=%s | image_size=%d bytes | mime=%s",
            GEMINI_MODEL,
            len(image_bytes),
            mime_type,
        )

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                _EXTRACTION_PROMPT,
                genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            ],
            config=genai_types.GenerateContentConfig(
                temperature=0.1,
                top_p=0.9,
                max_output_tokens=4096,
                response_mime_type="application/json",
            ),
        )

        raw_text: str = response.text

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Gemini API call failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini Vision API error: {exc}",
        ) from exc

    try:
        json_str = _extract_json_block(raw_text)
        data = json.loads(json_str)
    except (ValueError, json.JSONDecodeError) as exc:
        logger.error("Failed to parse Gemini response as JSON: %s", raw_text[:500])
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"The Vision AI returned non-JSON output that could not be parsed. Excerpt: {raw_text[:300]!r}",
        ) from exc

    return data


# ─────────────────────────────────────────────────────────────────────────────
# AUDIT PIPELINE HELPER
# ─────────────────────────────────────────────────────────────────────────────
async def _process_audit_pipeline(
    line_items: List[ExtractedLineItem],
    invoice_id: str
) -> FinalAuditReport:
    audited_items = []
    all_canonical_salts: List[str] = []
    total_paid = 0.0
    total_overcharge = 0.0
    total_potential_savings = 0.0

    for item in line_items:
        req = MappingRequest(
            query=item.brand_name,
            extracted_salt=item.extracted_salt
        )
        map_resp = await match_generic_alternative(req)

        is_overcharged = False
        overcharge_amount = 0.0
        potential_savings = 0.0
        ja_alternative = None
        ja_price = None

        if map_resp.match_found and map_resp.top_alternative:
            ja_alternative = map_resp.top_alternative.generic_name
            ja_price = map_resp.top_alternative.jan_aushadhi_price
            
            generic_total_cost = ja_price * item.quantity_units
            
            if item.paid_price > generic_total_cost:
                potential_savings = round(item.paid_price - generic_total_cost, 2)
                
        ceiling = item.printed_mrp
        if item.dpco_ceiling_price is not None:
            legal_cap = item.dpco_ceiling_price * item.quantity_units * 1.12
            ceiling = min(item.printed_mrp, legal_cap)
            
        overcharge_raw = item.paid_price - ceiling
        if overcharge_raw > 0:
            is_overcharged = True
            overcharge_amount = round(overcharge_raw, 2)

        audit_result = AuditResult(
            is_overcharged=is_overcharged,
            overcharge_amount=overcharge_amount,
            jan_aushadhi_alternative=ja_alternative,
            jan_aushadhi_price=ja_price,
            potential_savings=potential_savings
        )

        canonical_salt = generate_canonical_salt_key(item.extracted_salt if item.extracted_salt else item.brand_name)
        reg_status_dict = check_regulatory_status(canonical_salt)
        reg_status = RegulatoryStatus(**reg_status_dict)

        audited_line = AuditedLineItem(
            brand_name=item.brand_name,
            quantity_units=item.quantity_units,
            printed_mrp=item.printed_mrp,
            paid_price=item.paid_price,
            audit_summary=audit_result,
            regulatory_summary=reg_status,
            requires_pharmacist_verification=map_resp.requires_pharmacist_verification,
        )

        audited_items.append(audited_line)
        total_paid += item.paid_price
        total_overcharge += overcharge_amount
        total_potential_savings += potential_savings

        if canonical_salt:
            all_canonical_salts.append(canonical_salt)

    ddi_alerts = check_batch_interactions(all_canonical_salts)
    ddi_result = build_ddi_summary(ddi_alerts)

    return FinalAuditReport(
        invoice_id=invoice_id,
        total_paid=round(total_paid, 2),
        total_overcharge=round(total_overcharge, 2),
        total_potential_savings=round(total_potential_savings, 2),
        audited_items=audited_items,
        ddi_summary=ddi_result,
    )


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
@router.post(
    "/upload",
    response_model=FinalAuditReport,
    status_code=status.HTTP_200_OK,
    summary="Upload & Scan a Pharmacy Invoice, Return Audit Report",
)
async def upload_invoice_image(
    file: UploadFile = File(
        ...,
        description="Pharmacy bill image (JPG, PNG, WEBP, BMP — max 10 MB).",
    ),
) -> FinalAuditReport:
    content_type = (file.content_type or "").lower().strip()
    if content_type == "image/jpg":
        content_type = "image/jpeg"

    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{content_type}'. Accepted formats: {', '.join(sorted(ALLOWED_MIME_TYPES))}.",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image exceeds the 10 MB size limit (received {len(image_bytes) / 1_048_576:.1f} MB).",
        )

    logger.info("Invoice scan request | filename=%s | size=%.1f KB", file.filename, len(image_bytes) / 1024)

    raw_data = _call_gemini_vision(image_bytes, content_type)

    if raw_data.get("invoice_id") == "UNREADABLE":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The uploaded image could not be read as a pharmacy bill. Please upload a clearer photograph.",
        )

    try:
        scan_result = InvoiceScanResult.model_validate(raw_data)
    except Exception as exc:
        logger.error("Pydantic validation failed on Gemini output: %s | data=%s", exc, str(raw_data)[:500])
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Extracted data did not match expected schema: {exc}.",
        ) from exc

    return await _process_audit_pipeline(scan_result.line_items, invoice_id=scan_result.invoice_id)


@router.post(
    "/manual",
    response_model=FinalAuditReport,
    status_code=status.HTTP_200_OK,
    summary="Manually Audit Medicine Line Items",
)
async def audit_manual_invoice(req: ManualAuditRequest) -> FinalAuditReport:
    if not req.line_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one medicine line item is required."
        )

    converted_items = []
    for item in req.line_items:
        if not item.brand_name or not item.brand_name.strip():
            continue
        paid = float(item.paid_price) if item.paid_price is not None else 0.0
        mrp = float(item.printed_mrp) if (item.printed_mrp is not None and item.printed_mrp > 0) else paid
        qty = int(item.quantity_units) if (item.quantity_units and item.quantity_units > 0) else 1

        converted_items.append(
            ExtractedLineItem(
                brand_name=item.brand_name.strip().upper(),
                paid_price=paid,
                printed_mrp=mrp,
                quantity_units=qty,
                extracted_salt=item.extracted_salt,
            )
        )

    if not converted_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid medicine names provided."
        )

    return await _process_audit_pipeline(converted_items, invoice_id="MANUAL-ENTRY")
