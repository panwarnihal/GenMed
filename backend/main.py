import os
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient

# Load environment variables and initialize the FastAPI application
load_dotenv()
app = FastAPI(
    title="GenMed API Gateway",
    description="Deterministic Exact-Match Pharmaceutical Substitution Engine",
    version="1.0.0"
)

# Configure CORS middleware to enable communication with the frontend application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to authorized origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Modular Routers
from app.routes import mapping, scanner
app.include_router(mapping.router)
app.include_router(scanner.router)

# Establish connection to MongoDB Atlas database
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "genmed_db")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
branded_collection = db["Branded_Drugs"]
generic_collection = db["Generic_Inventory"]
blacklisted_collection = db["Blacklisted_Batches"]


import re

# --- Pydantic Models ---
class InteractionCheckRequest(BaseModel):
    salts: List[str]


class MappingMatchRequest(BaseModel):
    query: str
    extracted_salt: Optional[str] = None


def generate_canonical_salt_key(text: str) -> str:
    """
    Normalizes drug composition text into a standardized canonical key.
    """
    if not text or not isinstance(text, str):
        return ""

    text = text.lower()
    noise_patterns = [
        r'\bip\b', r'\bbp\b', r'\busp\b', r'\btrihydrate\b', r'\bhydrochloride\b',
        r'\bmaleate\b', r'\bsodium\b', r'\bpotassium\b', r'\btablet\b', r'\btablets\b',
        r'\bcapsule\b', r'\bcapsules\b', r'\bdispersible\b', r'\bsr\b', r'\ber\b'
    ]
    for pattern in noise_patterns:
        text = re.sub(pattern, '', text)

    text = re.sub(r'(\d+)\s*(mg|gm|g|ml|mcg|iu)', r'\1\2', text)
    components = re.split(r'\s*\+\s*|\s+and\s+', text)
    clean_tokens = [re.sub(r'[^a-z0-9]', '', c) for c in components if c.strip()]
    clean_tokens.sort()

    return "|".join(clean_tokens)


@app.get("/", tags=["Health"])
def health_check():
    """
    Endpoint to verify the health and online status of the API server.
    """
    return {"status": "ONLINE", "message": "GenMed Deterministic Engine is running."}


@app.get("/api/v1/substitute", tags=["Substitution Engine"])
def get_generic_substitute(
    brand: str = Query(..., description="Name of the branded drug (e.g., 'Brilinta 90mg')")
):
    """
    Deterministic Exact-Match Substitution:
    1. Retrieves the branded medicine record from the database.
    2. Identifies its SHA-256 chemical composition hash.
    3. Queries the PMBJP Generic inventory for an identical hash match.
    4. Computes cost savings and returns comparative data.
    """
    # Look up the branded drug (case-insensitive search)
    branded_drug = branded_collection.find_one(
        {"brand_name": {"$regex": f"^{brand.strip()}$", "$options": "i"}},
        {"_id": 0}
    )

    if not branded_drug:
        raise HTTPException(
            status_code=404,
            detail=f"Branded drug '{brand}' not found in commercial inventory."
        )

    # Extract the SHA-256 cryptographic composition hash
    salt_hash = branded_drug.get("salt_composition_hash")
    if not salt_hash:
        raise HTTPException(
            status_code=500,
            detail="Data integrity error: Drug record is missing its deterministic hash."
        )

    # Query the generic inventory for an exact SHA-256 match
    generic_match = generic_collection.find_one(
        {"salt_composition_hash": salt_hash},
        {"_id": 0}
    )

    # Failsafe mechanism: return structured status if no exact match is found
    if not generic_match:
        return {
            "status": "FAILSAFE_TRIGGERED",
            "message": "No exact deterministic chemical match found in the PMBJP Jan Aushadhi inventory. To ensure 100% patient safety, no substitution is recommended. Consult a physician.",
            "branded_drug": branded_drug,
            "generic_match": None,
            "savings": None
        }

    # Calculate financial metrics and potential savings
    mrp_price = float(branded_drug.get("mrp_price", 0))
    generic_price = float(generic_match.get("jan_aushadhi_price", 0))

    savings_rupees = round(mrp_price - generic_price, 2)
    savings_percentage = round(((mrp_price - generic_price) / mrp_price) * 100, 1) if mrp_price > 0 else 0.0

    return {
        "status": "SUCCESS",
        "match_type": "DETERMINISTIC_SHA256_EXACT",
        "salt_composition_hash": salt_hash,
        "branded_drug": branded_drug,
        "generic_match": generic_match,
        "savings": {
            "saved_rupees": savings_rupees,
            "saved_percentage": savings_percentage,
            "annual_savings_estimate": round(savings_rupees * 52, 2)  # Assuming typical chronic usage pattern
        }
    }


@app.get("/api/v1/verify-batch/{batch_number}", tags=["CDSCO Safety & Counterfeit Watchdog"])
def verify_batch_safety(batch_number: str):
    """
    CDSCO OSINT Verification:
    Verifies an alphanumeric batch number against official government Not of Standard Quality (NSQ)
    and counterfeit recall alerts.
    """
    clean_batch = batch_number.strip().upper()
    
    # Query database for matching blacklisted batch
    flagged_batch = blacklisted_collection.find_one(
        {"batch_number": clean_batch},
        {"_id": 0}
    )

    if flagged_batch:
        return {
            "status": "DANGER_BLACKLISTED",
            "safety_level": "RED_ALERT",
            "message": f"WARNING: Batch '{clean_batch}' appears on the CDSCO official recall/spurious blacklist! DO NOT CONSUME.",
            "cdsco_alert_details": flagged_batch
        }

    return {
        "status": "SAFE",
        "safety_level": "GREEN_VERIFIED",
        "message": f"Batch '{clean_batch}' has not been flagged in current CDSCO NSQ or Spurious recall blacklists.",
        "batch_checked": clean_batch
    }


@app.post("/api/v1/check-interactions", tags=["Clinical Safety"])
def check_drug_interactions(payload: InteractionCheckRequest):
    """
    Drug-Drug Interaction (DDI) Safety Engine:
    Analyzes active chemical salts for known clinical contraindications.
    """
    # Normalize inputs by cleaning and converting to lowercase
    active_salts = [s.strip().lower() for str_val in payload.salts for s in str_val.split(",")]
    
    # Pre-defined rule base for critical drug-drug contraindications
    known_interactions = [
        {
            "pair": {"ticagrelor", "aspirin"},
            "severity": "MODERATE_TO_HIGH",
            "warning": "Co-administration of Ticagrelor with high-dose Aspirin (>100mg) decreases the effectiveness of Ticagrelor and increases bleeding risk."
        },
        {
            "pair": {"amoxicillin", "methotrexate"},
            "severity": "HIGH",
            "warning": "Amoxicillin can reduce the renal clearance of Methotrexate, potentially leading to toxic methotrexate blood levels."
        },
        {
            "pair": {"atorvastatin", "clarithromycin"},
            "severity": "HIGH",
            "warning": "Clarithromycin significantly increases Atorvastatin exposure, raising the risk of myopathy and rhabdomyolysis."
        }
    ]

    detected_warnings = []
    salt_set = set(active_salts)

    for rule in known_interactions:
        if rule["pair"].issubset(salt_set):
            detected_warnings.append({
                "interacting_salts": list(rule["pair"]),
                "severity": rule["severity"],
                "clinical_warning": rule["warning"]
            })

    if detected_warnings:
        return {
            "status": "CONTRAINDICATION_DETECTED",
            "safety_level": "WARNING",
            "interaction_count": len(detected_warnings),
            "warnings": detected_warnings
        }

    return {
        "status": "SAFE_COMBINATION",
        "safety_level": "CLEAR",
        "message": "No major clinical drug-drug interactions detected among the provided salts.",
        "salts_checked": payload.salts
    }


@app.post("/api/v1/mapping/match", tags=["Mapping Engine"])
def match_generic_alternative(payload: MappingMatchRequest):
    """
    Atlas Search Mapping Engine Endpoint:
    Ingests drug query & extracted composition salt text, performs Lucene compound search,
    and returns top Jan Aushadhi generic alternative with relevance score.
    """
    target_salt = payload.extracted_salt if payload.extracted_salt else payload.query
    canonical_key = generate_canonical_salt_key(target_salt)

    pipeline = [
        {
            "$search": {
                "index": "default",
                "compound": {
                    "should": [
                        {
                            "text": {
                                "query": canonical_key,
                                "path": "canonical_salt_key",
                                "score": {"boost": {"value": 5.0}}
                            }
                        },
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
                "canonical_salt_key": 1,
                "search_score": {"$meta": "searchScore"}
            }
        },
        {"$limit": 1}
    ]

    try:
        results = list(generic_collection.aggregate(pipeline))
        if results:
            match = results[0]
            return {
                "match_found": True,
                "top_alternative": {
                    "drug_code": match.get("drug_code"),
                    "generic_name": match.get("generic_name"),
                    "jan_aushadhi_price": float(match.get("jan_aushadhi_price", 0.0)),
                    "search_score": round(float(match.get("search_score", 0.0)), 2)
                }
            }
        return {
            "match_found": False,
            "top_alternative": None
        }
    except Exception as e:
        # Fallback query if Atlas Search index is not yet indexed on Atlas UI
        fallback_match = generic_collection.find_one(
            {"canonical_salt_key": canonical_key},
            {"_id": 0}
        )
        if fallback_match:
            return {
                "match_found": True,
                "top_alternative": {
                    "drug_code": fallback_match.get("drug_code"),
                    "generic_name": fallback_match.get("generic_name"),
                    "jan_aushadhi_price": float(fallback_match.get("jan_aushadhi_price", 0.0)),
                    "search_score": 1.0
                }
            }
        return {
            "match_found": False,
            "top_alternative": None
        }