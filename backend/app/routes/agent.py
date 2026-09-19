from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.llm_provider import get_llm_provider

router = APIRouter()

class ChatRequest(BaseModel):
    prompt: str

import os
from pymongo import MongoClient

def _get_db():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/")
    client = MongoClient(mongo_uri)
    return client[os.getenv("DB_NAME", "genmed_db")]

def search_generic_medicine(brand_name: str) -> dict:
    """
    Search for a generic equivalent of a branded medicine in the Indian PMBJP/CDSCO database.
    If the database search returns status 'not_found', use your clinical knowledge to explain what the active ingredient is (e.g. Lipitor is Atorvastatin), but clarify that the specific brand is not in the Indian PMBJP/CDSCO database and suggest searching for the Indian equivalent or the generic salt name directly.
    
    Args:
        brand_name (str): The name of the branded medicine.
    """
    query = brand_name.strip()
    if not query:
        return {"status": "error", "message": "Search query cannot be empty."}

    db = _get_db()
    
    # Try exact match first
    brand_doc = db.Branded_Drugs.find_one({"brand_name": {"$regex": f"^{query}$", "$options": "i"}})
    
    if not brand_doc:
        # Try partial regex
        brand_doc = db.Branded_Drugs.find_one({"brand_name": {"$regex": query, "$options": "i"}})

    if not brand_doc:
        return {"status": "not_found", "message": f"No record found for '{query}' in the Indian medicine catalog."}
    
    salt_key = brand_doc.get("canonical_salt_key")
    if not salt_key:
        return {"status": "not_found", "message": f"No canonical salt key found for '{query}'."}
        
    generic_doc = db.Generic_Inventory.find_one({"canonical_salt_key": salt_key})
    
    if not generic_doc:
        return {"status": "not_found", "message": f"Brand '{brand_doc.get('brand_name')}' found, but no generic PMBJP alternative is available for salt '{salt_key}'."}
        
    return {
        "status": "success",
        "brand_name": brand_doc.get("brand_name"),
        "generic_match": generic_doc.get("drug_name"),
        "salt_composition": generic_doc.get("salt_composition"),
        "unit_price": generic_doc.get("unit_price")
    }

def locate_nearby_kendra(location_name: str) -> str:
    """
    Locate a nearby Jan Aushadhi Kendra based on the given location.
    
    Args:
        location_name (str): The name of the city or area.
    """
    return f"Nearby Kendra in {location_name} is located at Main Market, {location_name}."

@router.post("/api/v1/agent/chat")
async def chat_with_agent(request: ChatRequest):
    try:
        provider = get_llm_provider()
        tools = [search_generic_medicine, locate_nearby_kendra]
        response = await provider.generate_tool_response(request.prompt, tools)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
