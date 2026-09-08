import os
from pymongo import MongoClient

def ensure_indexes():
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME = os.getenv("DB_NAME", "genmed_db")

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    branded_collection = db["Branded_Drugs"]

    print("Creating index on brand_name...")
    branded_collection.create_index("brand_name")
    print("Index created successfully!")
    client.close()

if __name__ == "__main__":
    ensure_indexes()
