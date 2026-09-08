import os
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
    Finds nearby PMBJK stores using MongoDB 2dsphere index and $geoNear aggregation.
    """
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
                    "distance": 1,
                    "contact_number": 1
                }
            }
        ]
        
        nearby_kendras = list(kendras_collection.aggregate(pipeline))
        
        return {
            "status": "SUCCESS",
            "message": f"Found {len(nearby_kendras)} Kendras within {radius}m.",
            "results": nearby_kendras
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
