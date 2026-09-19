from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.llm_provider import get_llm_provider

router = APIRouter()

class ChatRequest(BaseModel):
    prompt: str

def search_generic_medicine(brand_name: str) -> str:
    """
    Search for a generic equivalent of a branded medicine.
    
    Args:
        brand_name (str): The name of the branded medicine.
    """
    return f"Generic equivalent for {brand_name} is Paracetamol."

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
