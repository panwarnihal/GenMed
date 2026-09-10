import os
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from pymongo import MongoClient

router = APIRouter()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "genmed_db")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
reviews_collection = db["Reviews"]

class ReviewCreate(BaseModel):
    name: Optional[str] = "Anonymous"
    email: Optional[str] = ""
    rating: int = Field(..., ge=1, le=5)
    category: str = "General Feedback"
    message: str = Field(..., min_length=2)

@router.get("/api/v1/reviews", tags=["Reviews"])
def get_reviews(limit: int = Query(50, ge=1, le=100)):
    """
    Fetch user reviews from MongoDB, sorted by newest first.
    """
    try:
        docs = list(reviews_collection.find({}, {"_id": 0}).sort("created_at", -1).limit(limit))
        return {
            "status": "SUCCESS",
            "count": len(docs),
            "reviews": docs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch reviews: {str(e)}")

@router.post("/api/v1/reviews", tags=["Reviews"])
def create_review(payload: ReviewCreate):
    """
    Submit a new user review to MongoDB.
    """
    try:
        now = datetime.now(timezone.utc)
        review_doc = {
            "name": payload.name.strip() if payload.name and payload.name.strip() else "Anonymous",
            "email": payload.email.strip() if payload.email else "",
            "rating": payload.rating,
            "category": payload.category,
            "message": payload.message.strip(),
            "date": now.strftime("%b %Y"),
            "created_at": now
        }
        reviews_collection.insert_one(review_doc)
        
        # Return inserted review document excluding MongoDB _id
        res_doc = {k: v for k, v in review_doc.items() if k != "_id"}
        return {
            "status": "SUCCESS",
            "message": "Review submitted successfully.",
            "review": res_doc
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save review: {str(e)}")
