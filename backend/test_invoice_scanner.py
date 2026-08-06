"""
==============================================================================
  GenMed Sprint 8 -- OCR & NLP Invoice Scanner Sandbox
  File  : test_invoice_scanner.py
  Usage : python test_invoice_scanner.py
  Deps  : pip install requests pydantic
==============================================================================

Pipeline validated by this script:

  [Chemist Bill / Strip Photo]
           |
           v
  +----------------------+
  | 1. OCR Engine (MOCK) |  <- Replace run_mock_ocr_ner_pipeline() with
  |    Vision / Textract |    real Cloud Vision / Textract call in Spt 9
  +----------------------+
           |
           v
  +----------------------+
  | 2. Medical NER       |  Extracts: Brand, Salt, Qty, MRP, Paid, Batch
  +----------------------+
           |
           v
  +----------------------+
  | 3. CDSCO Batch Check |  GET /api/v1/verify-batch/{batch_number}
  +----------------------+
           |
           v
  +----------------------+
  | 4. GenMed Audit      |  POST /api/v1/mapping/match  +  Overcharge Math
  +----------------------+
           |
           v
  +----------------------+
  | 5. Audit Report Card |  Printed to terminal
  +----------------------+
"""

import sys
import requests
from typing import List, Optional
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# CONFIGURATION -- point to your running FastAPI server
# ---------------------------------------------------------------------------
API_BASE_URL: str = "http://127.0.0.1:8000"
REQUEST_TIMEOUT: int = 6    # seconds per API call
GST_RATE: float = 0.12      # 12% GST applied on DPCO ceiling prices

# ANSI colour helpers -- gracefully no-ops when output is not a tty
def _c(code: str, text: str) -> str:
    if sys.stdout.isatty():
        return f"\033[{code}m{text}\033[0m"
    return text

GREEN   = lambda t: _c("92", t)
YELLOW  = lambda t: _c("93", t)
RED     = lambda t: _c("91", t)
CYAN    = lambda t: _c("96", t)
BOLD    = lambda t: _c("1",  t)
DIM     = lambda t: _c("2",  t)
MAGENTA = lambda t: _c("95", t)


# ===========================================================================
# SECTION 1 -- PYDANTIC SCHEMAS
# ===========================================================================

class ExtractedLineItem(BaseModel):
    """
    Represents a single medicine row parsed from a pharmacy bill.
    In production this is populated by the Cloud Vision -> NER pipeline.
    """
    brand_name:         str            = Field(...,  description="Branded drug name as printed on the bill")
    extracted_salt:     Optional[str]  = Field(None, description="Active ingredient composition if printed")
    quantity_units:     int            = Field(1,    description="Number of tablets / bottles billed")
    batch_number:       Optional[str]  = Field(None, description="Batch/Lot number for CDSCO safety check")
    printed_mrp:        float          = Field(...,  description="Maximum Retail Price per pack on label")
    paid_price:         float          = Field(...,  description="Actual amount charged on this bill")
    dpco_ceiling_price: Optional[float]= Field(None, description="NPPA / DPCO-II statutory ceiling per unit (pre-GST)")


class InvoiceScanResult(BaseModel):
    """Top-level container returned by the OCR/NER pipeline."""
    invoice_id:   str
    chemist_name: Optional[str] = None
    line_items:   List[ExtractedLineItem]


# ===========================================================================
# SECTION 2 -- MOCK OCR + NER PIPELINE
# ===========================================================================

def run_mock_ocr_ner_pipeline() -> InvoiceScanResult:
    """
    Simulates raw OCR -> NER structured extraction from an Indian pharmacy bill.

    PRODUCTION HOOK: replace the return value with the output of your
    Google Cloud Vision -> Medical NER extraction module. The function
    signature and return type stay identical.

    Test cases embedded here:
      Item 1 -- AUGMENTIN 625 DUO  : Charged at MRP (Legal). Batch CLEAN.
      Item 2 -- GLIMESTAR M2 SR    : Chemist overcharged Rs.15 ABOVE MRP.
                                     Batch GL992 triggers RED ALERT if
                                     seeded in Blacklisted_Batches collection.
      Item 3 -- PANTOP 40 TAB      : DPCO Schedule-I ceiling drug; tests
                                     the statutory cap calculation path.
    """
    return InvoiceScanResult(
        invoice_id="INV-2026-88914",
        chemist_name="Sharma Medical & General Store",
        line_items=[
            # Item 1: Standard branded antibiotic billed at MRP
            ExtractedLineItem(
                brand_name="AUGMENTIN 625 DUO TAB",
                extracted_salt="Amoxicillin 500mg + Clavulanic Acid 125mg",
                quantity_units=10,
                batch_number="C2381",
                printed_mrp=223.40,
                paid_price=223.40,
            ),
            # Item 2: Illegal overcharge -- paid > printed MRP
            ExtractedLineItem(
                brand_name="GLIMESTAR M2 SR TAB",
                extracted_salt="Glimepiride 2mg + Metformin 500mg",
                quantity_units=15,
                batch_number="GL992",     # seed Blacklisted_Batches to test RED ALERT
                printed_mrp=145.00,
                paid_price=160.00,        # Rs.15 over MRP -> illegal overcharge
            ),
            # Item 3: DPCO ceiling drug -- tests statutory cap math
            ExtractedLineItem(
                brand_name="PANTOP 40 TAB",
                extracted_salt="Pantoprazole 40mg",
                quantity_units=14,
                batch_number="PT4490",
                printed_mrp=98.00,
                paid_price=98.00,
                dpco_ceiling_price=4.40,  # Rs.4.40 / unit ceiling under NPPA
            ),
        ],
    )


# ===========================================================================
# SECTION 3 -- CDSCO BATCH SAFETY CHECK
# ===========================================================================

def check_batch_safety(batch_number: str) -> dict:
    """
    Calls GET /api/v1/verify-batch/{batch_number} on the running FastAPI server.
    Returns the raw JSON response dict, or a synthetic error dict on failure.
    """
    try:
        resp = requests.get(
            f"{API_BASE_URL}/api/v1/verify-batch/{batch_number}",
            timeout=REQUEST_TIMEOUT,
        )
        return resp.json()
    except Exception as exc:
        return {"status": "API_UNREACHABLE", "error": str(exc)}


# ===========================================================================
# SECTION 4 -- GENMED ATLAS MAPPING SEARCH
# ===========================================================================

def fetch_jan_aushadhi_alternative(brand_name: str, extracted_salt: Optional[str]) -> dict:
    """
    Calls POST /api/v1/mapping/match with brand name and optional salt text.
    Returns the raw JSON response dict, or a synthetic error dict on failure.
    """
    payload = {
        "query": brand_name,
        "extracted_salt": extracted_salt,
    }
    try:
        resp = requests.post(
            f"{API_BASE_URL}/api/v1/mapping/match",
            json=payload,
            timeout=REQUEST_TIMEOUT,
        )
        return resp.json()
    except Exception as exc:
        return {"match_found": False, "error": str(exc)}


# ===========================================================================
# SECTION 5 -- OVERCHARGE AUDIT MATH
# ===========================================================================

def calculate_overcharge(item: ExtractedLineItem) -> float:
    """
    Statutory Overcharge formula:

        O_item = max(0, P_paid - min(P_mrp, P_ceiling * units * (1 + GST)))

    If no DPCO ceiling is provided, the legal cap falls back to the printed
    MRP (the absolute maximum a chemist may legally charge).
    """
    legal_cap = item.printed_mrp
    if item.dpco_ceiling_price is not None:
        statutory_cap = item.dpco_ceiling_price * item.quantity_units * (1 + GST_RATE)
        legal_cap = min(item.printed_mrp, statutory_cap)
    return max(0.0, item.paid_price - legal_cap)


def calculate_generic_savings(paid_price: float, ja_price: float) -> float:
    """
    Jan Aushadhi Savings formula:

        S_item = max(0, P_paid - P_janaushadhi)
    """
    return max(0.0, paid_price - ja_price)


# ===========================================================================
# SECTION 6 -- MAIN AUDIT ENGINE
# ===========================================================================

def audit_invoice(scan_result: InvoiceScanResult) -> None:
    """
    Runs the full audit loop over every line-item extracted from the bill:
      1. CDSCO batch safety check
      2. Overcharge detection (MRP vs DPCO ceiling)
      3. Jan Aushadhi generic savings lookup
    Prints a formatted Consumer Audit Report Card to stdout.
    """
    SEP  = "=" * 66
    DASH = "-" * 66

    print(f"\n{SEP}")
    print(BOLD(f"  [*] GENMED CONSUMER AUDIT REPORT  |  {scan_result.invoice_id}"))
    if scan_result.chemist_name:
        print(f"       {DIM('Chemist :')} {scan_result.chemist_name}")
    print(f"{SEP}\n")

    total_bill_paid       = 0.0
    total_overcharge      = 0.0
    total_generic_savings = 0.0
    safety_alerts: List[str] = []

    for idx, item in enumerate(scan_result.line_items, start=1):
        total_bill_paid += item.paid_price

        print(BOLD(f"  -- ITEM #{idx} : {item.brand_name} --"))
        if item.extracted_salt:
            print(f"     {DIM('Salt     :')} {item.extracted_salt}")
        print(
            f"     {DIM('Qty      :')} {item.quantity_units}  |  "
            f"{DIM('MRP  :')} Rs.{item.printed_mrp:.2f}  |  "
            f"{DIM('Paid :')} Rs.{item.paid_price:.2f}"
        )
        if item.batch_number:
            print(f"     {DIM('Batch    :')} {item.batch_number}")
        print()

        # -- A. CDSCO Batch Safety -------------------------------------------
        if item.batch_number:
            batch_result = check_batch_safety(item.batch_number)
            bstatus = batch_result.get("status", "UNKNOWN")

            if bstatus == "DANGER_BLACKLISTED":
                print(
                    f"  {RED('[!!] CDSCO RED ALERT')} -- "
                    f"Batch {item.batch_number} is on the official recall / spurious blacklist!"
                )
                if "cdsco_alert_details" in batch_result:
                    details = batch_result["cdsco_alert_details"]
                    print(f"       {DIM('Reason    :')} {details.get('reason', 'N/A')}")
                    print(f"       {DIM('Alert     :')} {details.get('alert_type', 'N/A')}")
                print(f"       {RED('>>> DO NOT CONSUME THIS MEDICINE.')}\n")
                safety_alerts.append(item.brand_name)

            elif bstatus == "API_UNREACHABLE":
                print(
                    f"  {YELLOW('[!]  Batch check skipped')} -- "
                    f"API unreachable: {batch_result.get('error', '')}\n"
                )
            else:
                print(
                    f"  {GREEN('[OK] CDSCO Batch Clear')} -- "
                    f"Batch {item.batch_number} is not on any CDSCO recall list.\n"
                )

        # -- B. Overcharge Detection -----------------------------------------
        overcharge = calculate_overcharge(item)

        if item.dpco_ceiling_price is not None:
            cap_val = item.dpco_ceiling_price * item.quantity_units * (1 + GST_RATE)
            print(
                f"  {DIM('DPCO Ceiling (incl. GST) :')} "
                f"Rs.{cap_val:.2f}  "
                f"(Rs.{item.dpco_ceiling_price:.2f}/unit x {item.quantity_units} x {int(GST_RATE * 100)}% GST)"
            )

        if overcharge > 0.0:
            print(
                f"  {RED('[!!] ILLEGAL OVERCHARGE')} -- "
                f"Charged Rs.{overcharge:.2f} ABOVE the legal maximum price cap!"
            )
            total_overcharge += overcharge
        else:
            print(
                f"  {GREEN('[OK] Pricing Legal')} -- "
                f"Charged at or below the legal MRP / DPCO ceiling."
            )
        print()

        # -- C. Jan Aushadhi Generic Lookup ----------------------------------
        api_response = fetch_jan_aushadhi_alternative(item.brand_name, item.extracted_salt)

        if api_response.get("error"):
            print(f"  {RED('[X]  Mapping API unreachable')} -- {api_response['error']}\n")

        elif api_response.get("match_found"):
            alt      = api_response["top_alternative"]
            ja_price = float(alt["jan_aushadhi_price"])
            savings  = calculate_generic_savings(item.paid_price, ja_price)
            score    = alt.get("search_score", 0.0)

            total_generic_savings += savings
            print(
                f"  {CYAN('[>>] JAN AUSHADHI ALTERNATIVE FOUND')}  "
                f"{DIM(f'(Atlas relevance score: {score:.2f})')}"
            )
            print(f"       {DIM('Govt Generic :')} {alt['generic_name']}  ({alt['drug_code']})")
            print(f"       {DIM('Govt MRP     :')} Rs.{ja_price:.2f}")
            print(f"       {MAGENTA(f'You Save     :  Rs.{savings:.2f} per pack!')}\n")

        else:
            print(f"  {DIM('[i]  No Jan Aushadhi generic match found for this drug.')}\n")

        print(DASH)
        print()

    # -- Final Summary --------------------------------------------------------
    print(f"\n{SEP}")
    print(BOLD("  [SUMMARY]  FINAL AUDIT SUMMARY"))
    print(SEP)
    print(f"  {'Total Bill Paid            '} : Rs.{total_bill_paid:.2f}")

    if total_overcharge > 0.0:
        print(f"  {RED('Illegal Overcharge Detected')} : Rs.{total_overcharge:.2f}")
    else:
        print(f"  {'Illegal Overcharge Detected'} : {GREEN('Rs.0.00  [OK]')}")

    if total_generic_savings > 0.0:
        print(f"  {MAGENTA('Potential PMBJP Savings    ')} : Rs.{total_generic_savings:.2f}")
    else:
        print(f"  {'Potential PMBJP Savings    '} : Rs.0.00")

    if safety_alerts:
        print(f"\n  {RED('[!!] CDSCO SAFETY ALERTS')} -- DO NOT consume:")
        for drug in safety_alerts:
            print(f"       * {drug}")

    print()
    action_parts = []
    if total_overcharge > 0.0:
        action_parts.append("dispute the overcharge with your chemist / consumer court")
    if total_generic_savings > 0.0:
        action_parts.append(f"save Rs.{total_generic_savings:.2f} by switching to Jan Aushadhi generics")
    if safety_alerts:
        action_parts.append("return/destroy the flagged batch immediately")

    if action_parts:
        recommendation = "  >> " + "; and ".join(action_parts).capitalize() + "."
        print(YELLOW(recommendation))
    else:
        print(GREEN("  [OK] Bill verified clean -- no issues detected."))

    print(f"{SEP}\n")


# ===========================================================================
# SECTION 7 -- ENTRY POINT
# ===========================================================================

if __name__ == "__main__":
    # Step 1: Run the (mocked) OCR + NER pipeline
    mock_scan = run_mock_ocr_ner_pipeline()

    # Step 2: Feed structured output into the audit engine
    audit_invoice(mock_scan)
