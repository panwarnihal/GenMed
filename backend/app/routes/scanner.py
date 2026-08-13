"""
==============================================================================
  GenMed — OCR & NER Invoice Scanner Router
  File  : app/routes/scanner.py
  Route : POST /api/v1/scanner/upload

  Pipeline:
    [Pharmacy Bill Image]
         |
         v
    [Gemini 1.5 Flash Vision] ─── structured JSON prompt
         |
         v
    [Pydantic validation + sanitisation]
         |
         v
    [InvoiceScanResult JSON response]

  Environment variables required (add to backend/.env):
    GEMINI_API_KEY=<your-google-generativeai-key>

  Install dependency (already in requirements after this PR):
    pip install google-generativeai>=0.7.0
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
    "image/gif",          # animated GIF first-frame is fine for still bills
    "image/bmp",
}
MAX_IMAGE_BYTES = 10 * 1024 * 1024   # 10 MB hard cap (Gemini inline limit is 20 MB)
GEMINI_MODEL   = "gemini-1.5-flash"  # fast & cost-effective; swap to gemini-1.5-pro for max accuracy


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


class AuditResult(BaseModel):
    is_overcharged: bool
    overcharge_amount: float
    jan_aushadhi_alternative: Optional[str] = None
    jan_aushadhi_price: Optional[float] = None
    potential_savings: float


class AuditedLineItem(BaseModel):
    brand_name: str
    quantity_units: int
    printed_mrp: float
    paid_price: float
    audit_summary: AuditResult


class FinalAuditReport(BaseModel):
    invoice_id: str
    total_paid: float
    total_overcharge: float
    total_potential_savings: float
    audited_items: List[AuditedLineItem]


# ─────────────────────────────────────────────────────────────────────────────
# GEMINI VISION — EXTRACTION ENGINE
# ─────────────────────────────────────────────────────────────────────────────

# Authoritative system-level extraction prompt — keeps model output deterministic
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
    """
    Lazily imports google.genai (the current unified Gemini SDK) and returns
    a configured client.  Raises HTTPException 503 if the SDK is not installed
    or the API key is missing.
    """
    try:
        from google import genai  # type: ignore[import]
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "google-genai SDK is not installed. "
                "Run: pip install google-genai"
            ),
        )

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "GEMINI_API_KEY environment variable is not set. "
                "Add it to backend/.env and restart the server."
            ),
        )

    return genai.Client(api_key=api_key)


def _extract_json_block(raw: str) -> str:
    """
    Defensively extract the first {...} JSON object from a raw string.
    Handles cases where the model wraps output in ```json``` fences despite instructions.
    """
    # Strip markdown code fences if present
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fence_match:
        return fence_match.group(1)

    # Find the outermost braces
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
    """
    Sends the invoice image to Gemini Vision and returns the parsed JSON dict.

    Args:
        image_bytes: Raw bytes of the uploaded image.
        mime_type:   MIME type string (e.g. "image/jpeg").

    Returns:
        Parsed dict matching the InvoiceScanResult schema.

    Raises:
        HTTPException 422 if the model response cannot be parsed.
        HTTPException 502 if the Gemini API call fails.
    """
    from google import genai  # type: ignore[import]  (guarded by _build_gemini_client)
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
                temperature=0.1,        # near-deterministic for structured NER
                top_p=0.9,
                max_output_tokens=4096,
                response_mime_type="application/json",  # enforce JSON mode
            ),
        )

        raw_text: str = response.text

    except HTTPException:
        raise  # re-raise our own 503 from _build_gemini_client
    except Exception as exc:
        logger.exception("Gemini API call failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini Vision API error: {exc}",
        ) from exc

    # Parse & validate JSON
    try:
        json_str = _extract_json_block(raw_text)
        data = json.loads(json_str)
    except (ValueError, json.JSONDecodeError) as exc:
        logger.error("Failed to parse Gemini response as JSON: %s", raw_text[:500])
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"The Vision AI returned non-JSON output that could not be parsed. "
                f"Raw excerpt: {raw_text[:300]!r}"
            ),
        ) from exc

    return data


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────
@router.post(
    "/upload",
    response_model=FinalAuditReport,
    status_code=status.HTTP_200_OK,
    summary="Upload & Scan a Pharmacy Invoice, Return Audit Report",
    description=(
        "Accepts a JPEG / PNG / WEBP image of an Indian pharmacy bill. "
        "Passes it through Google Gemini Vision for OCR and Medical NER. "
        "Then queries the internal Mapping Engine for generic alternatives "
        "and calculates potential savings, returning a complete FinalAuditReport."
    ),
    responses={
        200: {"description": "Extraction and mapping succeeded — audit report returned."},
        400: {"description": "Invalid file type or oversized image."},
        422: {"description": "Vision AI returned unparseable or schema-invalid output."},
        502: {"description": "Upstream Gemini Vision API call failed."},
        503: {"description": "SDK not installed or GEMINI_API_KEY not configured."},
    },
)
async def upload_invoice_image(
    file: UploadFile = File(
        ...,
        description="Pharmacy bill image (JPG, PNG, WEBP, BMP — max 10 MB).",
    ),
) -> FinalAuditReport:
    """
    **OCR & NER Invoice Scanner — Full Pipeline**

    1. Validates the uploaded image (MIME type + size guard).
    2. Sends the raw bytes inline to **Google Gemini 1.5 Flash** Vision model
       with a deterministic extraction prompt.
    3. Parses and validates the model's JSON output through Pydantic schemas.
    4. Iterates over line items, querying the mapping engine for alternatives.
    5. Calculates overcharges and returns a fully-typed `FinalAuditReport`.
    """

    # ── 1. MIME-type guard ────────────────────────────────────────────────────
    content_type = (file.content_type or "").lower().strip()
    # Some clients send "image/jpg" instead of "image/jpeg"
    if content_type == "image/jpg":
        content_type = "image/jpeg"

    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file type '{content_type}'. "
                f"Accepted formats: {', '.join(sorted(ALLOWED_MIME_TYPES))}."
            ),
        )

    # ── 2. Read & size-guard ──────────────────────────────────────────────────
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Image exceeds the 10 MB size limit "
                f"(received {len(image_bytes) / 1_048_576:.1f} MB)."
            ),
        )

    logger.info(
        "Invoice scan request | filename=%s | size=%.1f KB",
        file.filename,
        len(image_bytes) / 1024,
    )

    # ── 3. Gemini Vision extraction ───────────────────────────────────────────
    raw_data = _call_gemini_vision(image_bytes, content_type)

    # ── 4. Handle "UNREADABLE" sentinel ──────────────────────────────────────
    if raw_data.get("invoice_id") == "UNREADABLE":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The uploaded image could not be read as a pharmacy bill. "
                "Please upload a clearer, well-lit photograph of the invoice."
            ),
        )

    # ── 5. Pydantic schema validation ─────────────────────────────────────────
    try:
        scan_result = InvoiceScanResult.model_validate(raw_data)
    except Exception as exc:
        logger.error(
            "Pydantic validation failed on Gemini output: %s | data=%s",
            exc,
            str(raw_data)[:500],
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Extracted data did not match the expected schema: {exc}. "
                f"Raw model output excerpt: {str(raw_data)[:300]!r}"
            ),
        ) from exc

    logger.info(
        "Scan complete | invoice_id=%s | line_items=%d",
        scan_result.invoice_id,
        len(scan_result.line_items),
    )

    # ── 6. Mapping & Audit Engine ─────────────────────────────────────────────
    audited_items = []
    total_paid = 0.0
    total_overcharge = 0.0
    total_potential_savings = 0.0

    for item in scan_result.line_items:
        # Call mapping engine
        req = MappingRequest(
            query=item.brand_name,
            extracted_salt=item.extracted_salt
        )
        # match_generic_alternative returns a MappingResponse
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
                is_overcharged = True
                potential_savings = round(item.paid_price - generic_total_cost, 2)
                overcharge_amount = potential_savings

        audit_result = AuditResult(
            is_overcharged=is_overcharged,
            overcharge_amount=overcharge_amount,
            jan_aushadhi_alternative=ja_alternative,
            jan_aushadhi_price=ja_price,
            potential_savings=potential_savings
        )

        audited_line = AuditedLineItem(
            brand_name=item.brand_name,
            quantity_units=item.quantity_units,
            printed_mrp=item.printed_mrp,
            paid_price=item.paid_price,
            audit_summary=audit_result
        )

        audited_items.append(audited_line)
        total_paid += item.paid_price
        total_overcharge += overcharge_amount
        total_potential_savings += potential_savings

    return FinalAuditReport(
        invoice_id=scan_result.invoice_id,
        total_paid=round(total_paid, 2),
        total_overcharge=round(total_overcharge, 2),
        total_potential_savings=round(total_potential_savings, 2),
        audited_items=audited_items
    )
