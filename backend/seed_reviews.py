import os
from datetime import datetime
from dotenv import load_dotenv  # type: ignore
from pymongo import MongoClient  # type: ignore

load_dotenv()
mongo_uri = os.getenv("MONGO_URI")
db_name = os.getenv("DB_NAME", "genmed_db")

client = MongoClient(mongo_uri)
db = client[db_name]

reviews_collection = db["Reviews"]

seed_reviews = [
    {
        "name": "Dr. Priya Sharma",
        "email": "priya.sharma@example.com",
        "rating": 5,
        "category": "Praise",
        "message": "Absolutely brilliant tool! I recommend this to all my patients who are on long-term medications. The savings are incredible - up to 85% in some cases.",
        "date": "Aug 2026",
        "created_at": datetime.utcnow()
    },
    {
        "name": "Rahul Verma",
        "email": "rahul.verma@example.com",
        "rating": 4,
        "category": "General Feedback",
        "message": "Very useful platform. Found the Jan Aushadhi equivalent for my mother's BP medicines in seconds. Would love an offline mode or a mobile app.",
        "date": "Jul 2026",
        "created_at": datetime.utcnow()
    },
    {
        "name": "Ananya Iyer",
        "email": "ananya.iyer@example.com",
        "rating": 5,
        "category": "Praise",
        "message": "The Bill Auditor caught an overcharge of ₹120 at our local pharmacy! This tool is doing something really important for India.",
        "date": "Jul 2026",
        "created_at": datetime.utcnow()
    }
]

def seed_reviews_db():
    print(f"Seeding reviews into '{db_name}.Reviews' collection...")
    # Clear existing reviews in collection to avoid duplicates on re-seed
    reviews_collection.delete_many({})
    result = reviews_collection.insert_many(seed_reviews)
    reviews_collection.create_index([("created_at", -1)])
    print(f"Successfully seeded {len(result.inserted_ids)} initial reviews into MongoDB!")

if __name__ == "__main__":
    seed_reviews_db()
