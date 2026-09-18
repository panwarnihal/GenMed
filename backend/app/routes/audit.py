"""
==============================================================================
  GenMed — MediCheck Comprehensive Prescription Audit Router
  File  : app/routes/audit.py
  Route : POST /api/v1/audit/comprehensive

  Pipeline:
    1. Accept a flat list of medicine name strings.
    2. For each medicine:
       a) Resolve the brand name → canonical_salt_key  (via mapping engine)
       b) Find the PMBJP generic equivalent             (exact salt match)
       c) Run CDSCO regulatory check                    (banned FDC / Sch-H1)
    3. After all medicines are processed:
       - Group by therapeutic class to detect redundancies.
    4. Return a unified JSON audit report.
==============================================================================
"""

import logging
import os
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from pymongo import MongoClient  # type: ignore[import]

from app.routes.mapping import (
    _resolve_brand_to_salt_key,
    _find_generic_by_salt_key,
)
from app.services.regulatory_service import check_regulatory_status
from utils_hasher import generate_canonical_salt_key

logger = logging.getLogger("genmed.audit")

# ─────────────────────────────────────────────────────────────────────────────
# ROUTER
# ─────────────────────────────────────────────────────────────────────────────
router = APIRouter(
    prefix="/api/v1/audit",
    tags=["MediCheck — Comprehensive Prescription Audit"],
)


# ─────────────────────────────────────────────────────────────────────────────
# DATABASE HELPER  (mirrors mapping.py pattern)
# ─────────────────────────────────────────────────────────────────────────────
def _get_db():
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MongoDB connection string (MONGO_URI) is not configured.",
        )
    client = MongoClient(mongo_uri)
    return client[os.getenv("DB_NAME", "genmed_db")]


# ─────────────────────────────────────────────────────────────────────────────
# THERAPEUTIC CLASS MAP  (MVP — expandable or DB-backed later)
#
# Maps canonical salt key *tokens* (individual normalized salt names) to their
# therapeutic class.  When two medicines share the same class, a redundancy
# warning is emitted.
# ─────────────────────────────────────────────────────────────────────────────
THERAPEUTIC_CLASS_MAP: dict[str, str] = {
    # Proton Pump Inhibitors (PPIs)
    "pantoprazole":   "Proton Pump Inhibitor (PPI)",
    "rabeprazole":    "Proton Pump Inhibitor (PPI)",
    "omeprazole":     "Proton Pump Inhibitor (PPI)",
    "esomeprazole":   "Proton Pump Inhibitor (PPI)",
    "lansoprazole":   "Proton Pump Inhibitor (PPI)",
    "dexlansoprazole":"Proton Pump Inhibitor (PPI)",

    # Statins
    "atorvastatin":   "Statin (HMG-CoA Reductase Inhibitor)",
    "rosuvastatin":   "Statin (HMG-CoA Reductase Inhibitor)",
    "simvastatin":    "Statin (HMG-CoA Reductase Inhibitor)",
    "pravastatin":    "Statin (HMG-CoA Reductase Inhibitor)",
    "fluvastatin":    "Statin (HMG-CoA Reductase Inhibitor)",
    "pitavastatin":   "Statin (HMG-CoA Reductase Inhibitor)",

    # ACE Inhibitors
    "enalapril":      "ACE Inhibitor",
    "ramipril":       "ACE Inhibitor",
    "lisinopril":     "ACE Inhibitor",
    "perindopril":    "ACE Inhibitor",
    "trandolapril":   "ACE Inhibitor",

    # ARBs
    "losartan":       "Angiotensin II Receptor Blocker (ARB)",
    "telmisartan":    "Angiotensin II Receptor Blocker (ARB)",
    "valsartan":      "Angiotensin II Receptor Blocker (ARB)",
    "olmesartan":     "Angiotensin II Receptor Blocker (ARB)",
    "candesartan":    "Angiotensin II Receptor Blocker (ARB)",
    "irbesartan":     "Angiotensin II Receptor Blocker (ARB)",

    # Calcium Channel Blockers
    "amlodipine":     "Calcium Channel Blocker (CCB)",
    "nifedipine":     "Calcium Channel Blocker (CCB)",
    "cilnidipine":    "Calcium Channel Blocker (CCB)",
    "felodipine":     "Calcium Channel Blocker (CCB)",

    # Beta Blockers
    "metoprolol":     "Beta Blocker",
    "atenolol":       "Beta Blocker",
    "bisoprolol":     "Beta Blocker",
    "propranolol":    "Beta Blocker",
    "nebivolol":      "Beta Blocker",
    "carvedilol":     "Beta Blocker",

    # NSAIDs
    "ibuprofen":      "NSAID (Non-Steroidal Anti-Inflammatory Drug)",
    "diclofenac":     "NSAID (Non-Steroidal Anti-Inflammatory Drug)",
    "naproxen":       "NSAID (Non-Steroidal Anti-Inflammatory Drug)",
    "aceclofenac":    "NSAID (Non-Steroidal Anti-Inflammatory Drug)",
    "piroxicam":      "NSAID (Non-Steroidal Anti-Inflammatory Drug)",
    "mefenamic":      "NSAID (Non-Steroidal Anti-Inflammatory Drug)",

    # Antiplatelet agents
    "clopidogrel":    "Antiplatelet Agent",
    "ticagrelor":     "Antiplatelet Agent",
    "prasugrel":      "Antiplatelet Agent",

    # SSRIs
    "fluoxetine":     "SSRI (Antidepressant)",
    "sertraline":     "SSRI (Antidepressant)",
    "escitalopram":   "SSRI (Antidepressant)",
    "paroxetine":     "SSRI (Antidepressant)",
    "citalopram":     "SSRI (Antidepressant)",
    "fluvoxamine":    "SSRI (Antidepressant)",

    # Benzodiazepines
    "alprazolam":     "Benzodiazepine",
    "diazepam":       "Benzodiazepine",
    "clonazepam":     "Benzodiazepine",
    "lorazepam":      "Benzodiazepine",

    # Fluoroquinolone antibiotics
    "ciprofloxacin":  "Fluoroquinolone Antibiotic",
    "levofloxacin":   "Fluoroquinolone Antibiotic",
    "ofloxacin":      "Fluoroquinolone Antibiotic",
    "moxifloxacin":   "Fluoroquinolone Antibiotic",
    "norfloxacin":    "Fluoroquinolone Antibiotic",

    # Antidiabetic — Sulfonylureas
    "glimepiride":    "Sulfonylurea (Antidiabetic)",
    "gliclazide":     "Sulfonylurea (Antidiabetic)",
    "glipizide":      "Sulfonylurea (Antidiabetic)",

    # Antidiabetic — DPP-4 Inhibitors
    "sitagliptin":    "DPP-4 Inhibitor (Antidiabetic)",
    "vildagliptin":   "DPP-4 Inhibitor (Antidiabetic)",
    "teneligliptin":  "DPP-4 Inhibitor (Antidiabetic)",
    "linagliptin":    "DPP-4 Inhibitor (Antidiabetic)",
    "saxagliptin":    "DPP-4 Inhibitor (Antidiabetic)",

    # Antacids — H2 blockers
    "ranitidine":     "H2 Receptor Antagonist",
    "famotidine":     "H2 Receptor Antagonist",
}


def _classify_therapeutic(canonical_salt_key: str) -> Optional[str]:
    """
    Given a canonical_salt_key like 'pantoprazole|40mg', extract individual
    salt tokens and look them up in the therapeutic class map.
    Returns the first matching therapeutic class, or None.
    """
    if not canonical_salt_key:
        return None
    # Canonical key format: "salt1|salt2" where each token is lowercase
    # with dosage attached (e.g., "pantoprazole|40mg"). Strip numbers to get
    # the base salt name for classification.
    import re
    tokens = canonical_salt_key.split("|")
    for token in tokens:
        # Remove trailing dosage digits + units (e.g., "40mg" → "")
        base_salt = re.sub(r'\d+\s*(mg|gm|g|ml|mcg|iu)$', '', token).strip()
        if base_salt in THERAPEUTIC_CLASS_MAP:
            return THERAPEUTIC_CLASS_MAP[base_salt]
    return None


# ─────────────────────────────────────────────────────────────────────────────
# PYDANTIC SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class ComprehensiveAuditRequest(BaseModel):
    medicines: List[str] = Field(
        ...,
        min_length=1,
        description="List of medicine brand names to audit.",
        examples=[["Pantoprazole", "Rabeprazole", "Augmentin"]],
    )


class AlternativeResult(BaseModel):
    input_name: str
    resolved_brand: Optional[str] = None
    canonical_salt_key: Optional[str] = None
    generic_name: Optional[str] = None
    generic_price: Optional[float] = None
    drug_code: Optional[str] = None
    match_found: bool = False


class RedundancyWarning(BaseModel):
    therapeutic_class: str
    medicines: List[str]
    warning: str


class NSQWarning(BaseModel):
    medicine: str
    status: str
    warning_message: str


class ComprehensiveAuditResponse(BaseModel):
    status: str = "AUDIT_COMPLETE"
    medicine_count: int
    alternatives: List[AlternativeResult]
    redundancies: List[RedundancyWarning]
    nsq_warnings: List[NSQWarning]


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────
@router.post(
    "/comprehensive",
    response_model=ComprehensiveAuditResponse,
    status_code=status.HTTP_200_OK,
    summary="Run a comprehensive MediCheck audit on a list of medicines",
)
async def run_comprehensive_audit(
    payload: ComprehensiveAuditRequest,
) -> ComprehensiveAuditResponse:
    """
    MediCheck Comprehensive Prescription Audit:
      1. Resolves each medicine name to its canonical_salt_key.
      2. Finds PMBJP Jan Aushadhi generic equivalents.
      3. Checks CDSCO regulatory status (banned FDC / Schedule H1).
      4. Detects therapeutic redundancy (multiple drugs in the same class).
    """
    db = _get_db()

    alternatives: List[AlternativeResult] = []
    nsq_warnings: List[NSQWarning] = []

    # Track: medicine_name → (canonical_salt_key, therapeutic_class)
    class_tracker: dict[str, list[str]] = {}  # class → [medicine names]

    for med_name in payload.medicines:
        clean_name = med_name.strip()
        if not clean_name:
            continue

        logger.info("Auditing medicine: '%s'", clean_name)

        # ── Stage 1: Resolve brand → canonical_salt_key ──────────────────
        canonical_key, confidence = _resolve_brand_to_salt_key(clean_name, db)

        resolved_brand = clean_name.upper()

        # ── Stage 2: Find generic alternative ────────────────────────────
        alt = AlternativeResult(
            input_name=clean_name,
            resolved_brand=resolved_brand,
            canonical_salt_key=canonical_key,
            match_found=False,
        )

        if canonical_key:
            generic_doc = _find_generic_by_salt_key(canonical_key, db)
            if generic_doc:
                alt.match_found = True
                alt.generic_name = generic_doc.get("generic_name", "")
                alt.generic_price = float(generic_doc.get("jan_aushadhi_price", 0.0))
                alt.drug_code = generic_doc.get("drug_code", "")

            # ── Stage 3: Regulatory / NSQ check ──────────────────────────
            reg_results = check_regulatory_status(canonical_key, medicine_name=clean_name)
            for reg_result in reg_results:
                reg_status = reg_result.get("status", "APPROVED")
                if reg_result.get("is_banned") or reg_status in ("SCHEDULE_H1", "NSQ_FLAGGED"):
                    nsq_warnings.append(NSQWarning(
                        medicine=clean_name,
                        status=reg_status,
                        warning_message=reg_result.get(
                            "warning_message",
                            f"{clean_name} has been flagged by CDSCO regulations."
                        ),
                    ))

            # ── Stage 4: Therapeutic class tracking ──────────────────────
            tc = _classify_therapeutic(canonical_key)
            if tc:
                class_tracker.setdefault(tc, []).append(clean_name)

        alternatives.append(alt)

    # ── Build redundancy warnings ────────────────────────────────────────
    redundancies: List[RedundancyWarning] = []
    for tc, meds in class_tracker.items():
        if len(meds) >= 2:
            redundancies.append(RedundancyWarning(
                therapeutic_class=tc,
                medicines=meds,
                warning=(
                    f"Multiple {tc} drugs detected: {', '.join(meds)}. "
                    "Concurrent use is rarely indicated — consult your physician."
                ),
            ))

    logger.info(
        "Audit complete | medicines=%d | alternatives=%d | redundancies=%d | nsq=%d",
        len(payload.medicines),
        len(alternatives),
        len(redundancies),
        len(nsq_warnings),
    )

    return ComprehensiveAuditResponse(
        status="AUDIT_COMPLETE",
        medicine_count=len(payload.medicines),
        alternatives=alternatives,
        redundancies=redundancies,
        nsq_warnings=nsq_warnings,
    )
