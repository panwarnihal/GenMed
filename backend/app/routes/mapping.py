import os
import re
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from pymongo import MongoClient
from utils_hasher import generate_canonical_salt_key

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

    try:
        # Priority 1: Exact match on canonical_salt_key
        exact_match = collection.find_one(
            {"canonical_salt_key": canonical_key},
            {"_id": 0}
        )
        
        if exact_match:
            return MappingResponse(
                match_found=True,
                top_alternative=AlternativeDetail(
                    drug_code=str(exact_match.get("drug_code", "")),
                    generic_name=str(exact_match.get("generic_name", "")),
                    jan_aushadhi_price=float(exact_match.get("jan_aushadhi_price", 0.0)),
                    search_score=100.0
                )
            )

        # Priority 2: Fuzzy text match for OCR typos using rapidfuzz
        from rapidfuzz import fuzz
        
        # Load all generics. In a real production system, cache this globally.
        all_generics = list(collection.find({}, {"_id": 0, "drug_code": 1, "generic_name": 1, "jan_aushadhi_price": 1}))
        
        best_match = None
        best_score = 0.0
        
        for doc in all_generics:
            generic_name = str(doc.get("generic_name", ""))
            # Use partial_ratio to handle subsets
            score = fuzz.partial_ratio(payload.query.lower(), generic_name.lower())
            if score > best_score:
                best_score = score
                best_match = doc
                
        # Define a threshold for acceptable match
        if best_match and best_score >= 70.0:
            return MappingResponse(
                match_found=True,
                top_alternative=AlternativeDetail(
                    drug_code=str(best_match.get("drug_code", "")),
                    generic_name=str(best_match.get("generic_name", "")),
                    jan_aushadhi_price=float(best_match.get("jan_aushadhi_price", 0.0)),
                    search_score=round(best_score, 2)
                )
            )
            
        return MappingResponse(match_found=False, top_alternative=None)
        
    except Exception as e:
        return MappingResponse(match_found=False, top_alternative=None)
