import os
import re
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from pymongo import MongoClient

router = APIRouter(
    prefix="/api/v1/mapping",
    tags=["Generic Medicine Mapping"]
)

# -----------------------------------------------------------------------------
# 1. PYDANTIC SCHEMAS (Request & Response Validation)
# -----------------------------------------------------------------------------
class MappingRequest(BaseModel):
    query: str = Field(..., description="Raw brand name or line item from invoice OCR", example="Augmentin 625 Duo Tab")
    extracted_salt: Optional[str] = Field(
        None, 
        description="Parsed chemical composition from Medical NER", 
        example="Amoxicillin 500mg + Clavulanic Acid 125mg"
    )

class AlternativeDetail(BaseModel):
    drug_code: str
    generic_name: str
    jan_aushadhi_price: float
    search_score: float

class MappingResponse(BaseModel):
    match_found: bool
    top_alternative: Optional[AlternativeDetail] = None


# -----------------------------------------------------------------------------
# 2. CANONICAL SALT CLEANER HELPER
# -----------------------------------------------------------------------------
def generate_canonical_salt_key(text: str) -> str:
    """
    Normalizes drug composition text into a standardized canonical key:
    - Lowercase & strip pharmacopeial tags (IP/BP/USP)
    - Standardize dosage units (500 mg -> 500mg)
    - Alphabetically sort components
    """
    if not text or not isinstance(text, str):
        return ""

    text = text.lower()
    
    # Strip pharmacopeial & dosage form noise
    noise_patterns = [
        r'\bip\b', r'\bbp\b', r'\busp\b', r'\btrihydrate\b', r'\bhydrochloride\b',
        r'\bmaleate\b', r'\bsodium\b', r'\bpotassium\b', r'\btablet\b', r'\btablets\b',
        r'\bcapsule\b', r'\bcapsules\b', r'\bdispersible\b', r'\bsr\b', r'\ber\b'
    ]
    for pattern in noise_patterns:
        text = re.sub(pattern, '', text)

    # Standardize unit spacing
    text = re.sub(r'(\d+)\s*(mg|gm|g|ml|mcg|iu)', r'\1\2', text)

    # Tokenize multi-salt compositions separated by '+' or 'and'
    components = re.split(r'\s*\+\s*|\s+and\s+', text)
    clean_tokens = [re.sub(r'[^a-z0-9]', '', c) for c in components if c.strip()]
    clean_tokens.sort()

    return "|".join(clean_tokens)


# -----------------------------------------------------------------------------
# 3. MAPPING ENDPOINT
# -----------------------------------------------------------------------------
@router.post("/match", response_model=MappingResponse, status_code=status.HTTP_200_OK)
async def match_generic_alternative(payload: MappingRequest):
    """
    Queries MongoDB Atlas Search (`Generic_Inventory`) to find the best 
    Jan Aushadhi generic alternative for an incoming branded drug.
    """
    # Use canonical salt if provided, otherwise fallback to query string
    salt_input = payload.extracted_salt if payload.extracted_salt else payload.query
    canonical_key = generate_canonical_salt_key(salt_input)

    # Connect to Atlas (Use DB connection pool in production)
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MongoDB connection string (MONGO_URI) is not configured."
        )

    client = MongoClient(mongo_uri)
    db = client["genmed_db"]
    collection = db["Generic_Inventory"]

    # MongoDB Atlas $search Pipeline
    pipeline = [
        {
            "$search": {
                "index": "default",
                "compound": {
                    "should": [
                        # Priority 1: Direct match on canonical salt key (Boosted 5.0x)
                        {
                            "text": {
                                "query": canonical_key,
                                "path": "canonical_salt_key",
                                "score": {"boost": {"value": 5.0}}
                            }
                        },
                        # Priority 2: Fuzzy text match for OCR typos on generic name
                        {
                            "text": {
                                "query": payload.query,
                                "path": "generic_name",
                                "fuzzy": {
                                    "maxEdits": 1,
                                    "prefixLength": 3
                                }
                            }
                        }
                    ],
                    "minimumShouldMatch": 1
                }
            }
        },
        {
            "$project": {
                "_id": 0,
                "drug_code": 1,
                "generic_name": 1,
                "jan_aushadhi_price": 1,
                "search_score": {"$meta": "searchScore"}
            }
        },
        {"$limit": 1}
    ]

    try:
        results = list(collection.aggregate(pipeline))
    except Exception as e:
        # Fallback to regex find if Atlas Search index is compiling
        fallback = collection.find_one(
            {"canonical_salt_key": {"$regex": canonical_key, "$options": "i"}},
            {"_id": 0}
        )
        if fallback:
            return MappingResponse(
                match_found=True,
                top_alternative=AlternativeDetail(
                    drug_code=str(fallback.get("drug_code", "")),
                    generic_name=str(fallback.get("generic_name", "")),
                    jan_aushadhi_price=float(fallback.get("jan_aushadhi_price", 0.0)),
                    search_score=1.0
                )
            )
        return MappingResponse(match_found=False, top_alternative=None)

    if not results:
        return MappingResponse(match_found=False, top_alternative=None)

    top_doc = results[0]
    
    # Format the top result
    alternative = AlternativeDetail(
        drug_code=str(top_doc.get("drug_code", "")),
        generic_name=str(top_doc.get("generic_name", "")),
        jan_aushadhi_price=float(top_doc.get("jan_aushadhi_price", 0.0)),
        search_score=round(float(top_doc.get("search_score", 0.0)), 2)
    )

    return MappingResponse(match_found=True, top_alternative=alternative)
