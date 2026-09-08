import os
import requests
from fastapi import APIRouter, HTTPException, Query
from pymongo import MongoClient

router = APIRouter()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "genmed_db")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
kendras_collection = db["Kendras"]

@router.get("/api/v1/kendras/nearby", tags=["Kendra Locator"])
def get_nearby_kendras(
    lat: float = Query(..., description="Latitude of the user"),
    lng: float = Query(..., description="Longitude of the user"),
    radius: int = Query(5000, description="Search radius in meters")
):
    """
    Finds nearby PMBJK stores using OpenStreetMap Overpass API. Falls back to MongoDB.
    """
    overpass_url = "http://overpass-api.de/api/interpreter"
    query = f"""
    [out:json];
    node["amenity"="pharmacy"]["name"~"Jan Aushadhi|Janaushadhi|PMBJK", i](around:{radius},{lat},{lng});
    out body;
    """
    
    fallback_used = False
    results = []
    
    try:
        headers = {
            "User-Agent": "GenMed-App/1.0 (contact@example.com)",
            "Accept": "*/*"
        }
        # Short timeout so the user isn't waiting forever if API is blocked
        response = requests.get(overpass_url, params={'data': query.strip()}, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        for element in data.get("elements", []):
            tags = element.get("tags", {})
            results.append({
                "lat": element.get("lat"),
                "lon": element.get("lon"),
                "name": tags.get("name", "Jan Aushadhi Kendra"),
                "address": tags.get("addr:full") or tags.get("addr:street", "Address not available"),
                "contact_number": tags.get("phone")
            })
            
    except Exception as e:
        fallback_used = True
        try:
            pipeline = [
                {
                    "$geoNear": {
                        "near": {
                            "type": "Point",
                            "coordinates": [lng, lat]
                        },
                        "distanceField": "distance",
                        "maxDistance": radius,
                        "spherical": True
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "store_name": 1,
                        "address": 1,
                        "location": 1,
                        "contact_number": 1
                    }
                }
            ]
            nearby_kendras = list(kendras_collection.aggregate(pipeline))
            
            # Map MongoDB format to match the frontend expectations (which uses the Overpass schema)
            for k in nearby_kendras:
                coords = k.get("location", {}).get("coordinates", [0, 0])
                results.append({
                    "lat": coords[1],
                    "lon": coords[0],
                    "name": k.get("store_name", "Jan Aushadhi Kendra"),
                    "address": k.get("address", "Address not available"),
                    "contact_number": k.get("contact_number")
                })
        except Exception as mongo_err:
            raise HTTPException(status_code=500, detail=f"Overpass API error ({str(e)}) and MongoDB fallback failed ({str(mongo_err)})")
            
    return {
        "status": "SUCCESS",
        "message": f"Found {len(results)} Kendras within {radius}m.",
        "fallback_used": fallback_used,
        "results": results
    }
