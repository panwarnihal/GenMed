"""
==============================================================================
  GenMed — Two-Stage Clinical Generic Mapping Engine
  File  : app/routes/mapping.py

  Safety-First Architecture:
    Stage 1 (Brand Resolution):
        Resolve the incoming OCR brand name against the Branded_Drugs collection
        to retrieve the drug's exact canonical_salt_key.  RapidFuzz is used ONLY
        here, strictly for OCR typo correction with a >90% confidence threshold.

    Stage 2 (Generic Strict Match):
        Query the Generic_Inventory collection using an EXACT match on the
        resolved canonical_salt_key.  No fuzzy matching is ever applied to
        chemical salt names — this prevents Look-Alike Sound-Alike (LASA)
        cross-contamination between pharmacologically unrelated drugs.

  Quarantine:
        If Brand Resolution scores below 90%, OR the resolved salt has no
        generic equivalent in the PMBI inventory, the response returns
        match_found=False, top_alternative=None, and sets the new flag
        requires_pharmacist_verification=True.
==============================================================================
"""

import os
import re
import logging
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional
from pymongo import MongoClient  # type: ignore[import]
from cachetools import TTLCache  # type: ignore[import]
from utils_hasher import generate_canonical_salt_key

logger = logging.getLogger("genmed.mapping")

# ─────────────────────────────────────────────────────────────────────────────
# IN-MEMORY TTL CACHE  (avoids repeat Atlas Search calls for common medicines)
# ─────────────────────────────────────────────────────────────────────────────
# max 500 distinct query keys, 1-hour TTL
_MATCH_CACHE: TTLCache = TTLCache(maxsize=500, ttl=3600)

router = APIRouter(
    prefix="/api/v1/mapping",
    tags=["Generic Medicine Mapping"],
)

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────
BRAND_FUZZY_THRESHOLD = 90.0   # Minimum RapidFuzz score for brand OCR typo correction


# ─────────────────────────────────────────────────────────────────────────────
# PYDANTIC SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class MappingRequest(BaseModel):
    query: str = Field(
        ...,
        description="Raw brand name or line item from invoice OCR",
        examples=["Augmentin 625 Duo Tab"],
    )
    extracted_salt: Optional[str] = Field(
        None,
        description="Parsed chemical composition from Medical NER",
        examples=["Amoxicillin 500mg + Clavulanic Acid 125mg"],
    )


class AlternativeDetail(BaseModel):
    drug_code: str
    generic_name: str
    jan_aushadhi_price: float
    search_score: float


class MappingResponse(BaseModel):
    match_found: bool
    top_alternative: Optional[AlternativeDetail] = None
    requires_pharmacist_verification: bool = False


# ─────────────────────────────────────────────────────────────────────────────
# DATABASE HELPER
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
# STAGE 1 — BRAND RESOLUTION  (RapidFuzz for OCR typos only, >90% threshold)
# ─────────────────────────────────────────────────────────────────────────────

def _extract_csk_from_doc(doc: dict) -> Optional[str]:
    """
    Extract or derive the canonical_salt_key from a Branded_Drugs document,
    handling both document schemas (seed_db.py and seed_branded_drugs.py).
    """
    # Priority 1: direct field
    csk = doc.get("canonical_salt_key")
    if csk:
        return csk

    # Priority 2: derive from raw_composition text
    raw_comp = doc.get("raw_composition")
    if raw_comp:
        return generate_canonical_salt_key(raw_comp)

    # Priority 3: derive from active_ingredients list
    ingredients = doc.get("active_ingredients")
    if ingredients and isinstance(ingredients, list):
        comp_str = " + ".join(
            f"{i.get('salt', '')} {i.get('strength', '')}" for i in ingredients
        )
        return generate_canonical_salt_key(comp_str)

    return None


_BRAND_PROJECTION = {
    "_id": 0, "brand_name": 1, "canonical_salt_key": 1,
    "raw_composition": 1, "active_ingredients": 1,
}


def _clean_brand_for_matching(brand: str) -> str:
    import re
    s = brand.lower()
    # Strip common dosage form noise
    s = re.sub(r'\b(tablet|tab|capsule|cap|injection|inj|syrup|syp|suspension|susp|mg|ml|gm)\b', '', s)
    # Strip attached numbers like '500mg' -> '500'
    s = re.sub(r'(\d+)mg', r'\1', s)
    s = re.sub(r'(\d+)ml', r'\1', s)
    s = re.sub(r'(\d+)gm', r'\1', s)
    return re.sub(r'\s+', ' ', s).strip()


def _resolve_brand_to_salt_key(brand_query: str, db) -> tuple[Optional[str], float]:
    """
    Resolve an OCR-extracted brand name to its canonical_salt_key via
    the Branded_Drugs collection.

    Returns:
        (canonical_salt_key, confidence_score)
        canonical_salt_key is None if no match above the safety threshold.
    """
    branded_col = db["Branded_Drugs"]
    query_clean = brand_query.strip()

    # 1a. Try exact case-insensitive match first (fastest path)
    exact_doc = branded_col.find_one(
        {"brand_name": {"$regex": f"^{query_clean}$", "$options": "i"}},
        _BRAND_PROJECTION,
    )
    if exact_doc:
        csk = _extract_csk_from_doc(exact_doc)
        return csk, 100.0

    # 1b. Fuzzy fallback — correct minor OCR typos in brand name only.
    #     Load a projection of brand names and their salt keys.
    from rapidfuzz import fuzz  # type: ignore[import]

    all_brands = list(branded_col.find({}, _BRAND_PROJECTION))

    best_doc = None
    best_score = 0.0

    for doc in all_brands:
        db_brand = str(doc.get("brand_name", ""))
        
        # Clean both query and DB brand name before comparing
        query_cleaned = _clean_brand_for_matching(query_clean)
        db_brand_cleaned = _clean_brand_for_matching(db_brand)
        
        score = fuzz.ratio(query_cleaned, db_brand_cleaned)
        if score > best_score:
            best_score = score
            best_doc = doc

    if best_doc and best_score >= BRAND_FUZZY_THRESHOLD:
        csk = _extract_csk_from_doc(best_doc)
        logger.info(
            "Brand resolved via fuzzy match: '%s' -> '%s' (%.1f%%)",
            query_clean, best_doc.get("brand_name"), best_score,
        )
        return csk, best_score

    # No brand match above threshold
    logger.warning(
        "Brand '%s' could not be resolved (best score: %.1f%% < %.1f%% threshold).",
        query_clean, best_score, BRAND_FUZZY_THRESHOLD,
    )
    return None, best_score


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 2 — GENERIC STRICT MATCH  (exact canonical_salt_key, zero fuzziness)
# ─────────────────────────────────────────────────────────────────────────────
def _find_generic_by_salt_key(canonical_salt_key: str, db) -> Optional[dict]:
    """
    Query Generic_Inventory for an EXACT match on canonical_salt_key.
    No fuzzy matching is applied — this is the clinical safety boundary.
    """
    generic_col = db["Generic_Inventory"]

    match = generic_col.find_one(
        {"canonical_salt_key": canonical_salt_key},
        {"_id": 0},
    )
    return match


# ─────────────────────────────────────────────────────────────────────────────
# AUTOCOMPLETE ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/autocomplete", status_code=status.HTTP_200_OK, tags=["Search"])
def autocomplete_brand(
    q: str = Query(..., min_length=2, description="Prefix to search brand names"),
):
    """
    Returns up to 8 brand name suggestions for the typeahead UI.
    Performs a case-insensitive prefix search against the Branded_Drugs collection.
    """
    db = _get_db()
    branded_col = db["Branded_Drugs"]
    try:
        escaped = re.escape(q.strip())
        results = branded_col.find(
            {"brand_name": {"$regex": f"^{escaped}", "$options": "i"}},
            {"_id": 0, "brand_name": 1},
        ).limit(8)
        suggestions = [doc["brand_name"] for doc in results if "brand_name" in doc]
        return {"suggestions": suggestions}
    except Exception as exc:
        logger.warning("Autocomplete error: %s", exc)
        return {"suggestions": []}


# ─────────────────────────────────────────────────────────────────────────────
# MAPPING ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/match", response_model=MappingResponse, status_code=status.HTTP_200_OK)
async def match_generic_alternative(payload: MappingRequest):
    """
    Two-Stage Clinical Mapping Pipeline:
      Stage 1 — Resolve brand name to canonical_salt_key via Branded_Drugs.
      Stage 2 — Exact-match the salt key against Generic_Inventory.

    If either stage fails, the item is quarantined with
    requires_pharmacist_verification=True.
    Results are cached in memory for 1 hour to reduce Atlas Search load.
    """
    # ── Cache lookup ────────────────────────────────────────────────────────
    cache_key = f"{payload.query.strip().lower()}|{(payload.extracted_salt or '').strip().lower()}"
    if cache_key in _MATCH_CACHE:
        logger.debug("Cache HIT for key='%s'", cache_key)
        return _MATCH_CACHE[cache_key]

    db = _get_db()

    # ── Determine the canonical salt key ────────────────────────────────────
    canonical_key: Optional[str] = None
    brand_confidence: float = 0.0

    if payload.extracted_salt:
        # When the scanner/NER already extracted the chemical composition,
        # derive the canonical key directly — no brand lookup needed.
        canonical_key = generate_canonical_salt_key(payload.extracted_salt)
        brand_confidence = 100.0
        logger.info(
            "Salt key derived from extracted_salt: '%s' -> '%s'",
            payload.extracted_salt, canonical_key,
        )

    if not canonical_key:
        # Stage 1: Resolve brand name → canonical_salt_key
        canonical_key, brand_confidence = _resolve_brand_to_salt_key(
            payload.query, db
        )

    # If we still don't have a salt key, quarantine
    if not canonical_key:
        logger.warning(
            "QUARANTINE: Unable to resolve salt key for query='%s'. "
            "Requires pharmacist verification.",
            payload.query,
        )
        return MappingResponse(
            match_found=False,
            top_alternative=None,
            requires_pharmacist_verification=True,
        )

    # ── Stage 2: Exact generic match on canonical_salt_key ──────────────────
    generic_doc = _find_generic_by_salt_key(canonical_key, db)

    if generic_doc:
        result = MappingResponse(
            match_found=True,
            top_alternative=AlternativeDetail(
                drug_code=str(generic_doc.get("drug_code", "")),
                generic_name=str(generic_doc.get("generic_name", "")),
                jan_aushadhi_price=float(generic_doc.get("jan_aushadhi_price", 0.0)),
                search_score=round(brand_confidence, 2),
            ),
            requires_pharmacist_verification=False,
        )
        _MATCH_CACHE[cache_key] = result
        return result

    # Salt key resolved but no generic equivalent exists in PMBI inventory
    logger.info(
        "No PMBI generic found for canonical_salt_key='%s'. Quarantined.",
        canonical_key,
    )
    result = MappingResponse(
        match_found=False,
        top_alternative=None,
        requires_pharmacist_verification=True,
    )
    _MATCH_CACHE[cache_key] = result
    return result
