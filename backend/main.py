import os
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

# 1. Load environment variables & initialize FastAPI
load_dotenv()
app = FastAPI(
    title="GenMed API Gateway",
    description="Deterministic Exact-Match Pharmaceutical Substitution Engine",
    version="1.0.0"
)

# 2. Add CORS Middleware (So your React frontend can call this API later without errors)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend URL (e.g., http://localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Connect to MongoDB Atlas
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "genmed_db")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
branded_collection = db["Branded_Drugs"]
generic_collection = db["Generic_Inventory"]


@app.get("/", tags=["Health"])
def health_check():
    """Simple health check endpoint to confirm the server is running."""
    return {"status": "ONLINE", "message": "GenMed Deterministic Engine is running."}


@app.get("/api/v1/substitute", tags=["Substitution Engine"])
def get_generic_substitute(
    brand: str = Query(..., description="Name of the branded drug (e.g., 'Brilinta 90mg')")
):
    """
    Deterministic Exact-Match Endpoint:
    1. Looks up the branded medicine in MongoDB.
    2. Retrieves its SHA-256 salt composition hash.
    3. Queries the PMBJP Generic inventory for an exact hash match.
    4. Returns comparison data and calculates financial savings.
    """
    # Step 1: Look up the branded drug (Case-insensitive search)
    branded_drug = branded_collection.find_one(
        {"brand_name": {"$regex": f"^{brand.strip()}$", "$options": "i"}},
        {"_id": 0}  # Exclude MongoDB ObjectId from JSON response
    )

    if not branded_drug:
        raise HTTPException(
            status_code=404,
            detail=f"Branded drug '{brand}' not found in our commercial inventory."
        )

    # Step 2: Extract the SHA-256 Hash
    salt_hash = branded_drug.get("salt_composition_hash")
    if not salt_hash:
        raise HTTPException(
            status_code=500,
            detail="Data integrity error: Drug record is missing its deterministic hash."
        )

    # Step 3: Query Generic Inventory for the EXACT SHA-256 match
    generic_match = generic_collection.find_one(
        {"salt_composition_hash": salt_hash},
        {"_id": 0}
    )

    # Step 4: Zero-Risk Failsafe (If no exact chemical match exists)
    if not generic_match:
        return {
            "status": "FAILSAFE_TRIGGERED",
            "message": "No exact deterministic chemical match found in the PMBJP Jan Aushadhi inventory. To ensure 100% patient safety, no substitution is recommended. Consult a physician.",
            "branded_drug": branded_drug,
            "generic_match": None,
            "savings": None
        }

    # Step 5: Calculate Savings Metrics for the UI Savings Gauge
    mrp_price = float(branded_drug.get("mrp_price", 0))
    generic_price = float(generic_match.get("jan_aushadhi_price", 0))

    savings_rupees = round(mrp_price - generic_price, 2)
    savings_percentage = round(((mrp_price - generic_price) / mrp_price) * 100, 1) if mrp_price > 0 else 0.0

    # Step 6: Return the clean, structured payload
    return {
        "status": "SUCCESS",
        "match_type": "DETERMINISTIC_SHA256_EXACT",
        "salt_composition_hash": salt_hash,
        "branded_drug": branded_drug,
        "generic_match": generic_match,
        "savings": {
            "saved_rupees": savings_rupees,
            "saved_percentage": savings_percentage,
            "annual_savings_estimate": round(savings_rupees * 52, 2)  # Assuming 1 strip/week for chronic meds
        }
    }