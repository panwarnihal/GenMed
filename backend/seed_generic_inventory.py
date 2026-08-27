import os
import re
import hashlib
import pandas as pd  # type: ignore
from dotenv import load_dotenv  # type: ignore
from pymongo import MongoClient, UpdateOne  # type: ignore

from utils_hasher import generate_canonical_salt_key

def seed_database(csv_path: str, mongo_uri: str):
    client = MongoClient(mongo_uri)
    collection = client["genmed_db"]["Generic_Inventory"]
    
    df = pd.read_csv(csv_path)
    operations = []
    
    for _, row in df.iterrows():
        drug_code = str(row.get("Drug Code", "")).strip()
        generic_name = str(row.get("Generic Name", "")).strip()
        unit_size = str(row.get("Unit Size", "")).strip()
        mrp = float(row.get("MRP", 0.0))
        
        canonical_key = generate_canonical_salt_key(generic_name)
        salt_hash = hashlib.sha256(canonical_key.encode('utf-8')).hexdigest() if canonical_key else ""
        
        doc = {
            "drug_code": drug_code,
            "generic_name": generic_name,
            "canonical_salt_key": canonical_key,
            "salt_composition_hash": salt_hash,
            "unit_size": unit_size,
            "jan_aushadhi_price": mrp
        }
        
        # Upsert based on unique drug_code to avoid duplicates
        operations.append(
            UpdateOne({"drug_code": drug_code}, {"$set": doc}, upsert=True)
        )
        
    if operations:
        result = collection.bulk_write(operations)
        print(f"[SUCCESS] Seeding Complete! Upserted: {result.upserted_count}, Modified: {result.modified_count}")
        
    print("Creating indices...")
    collection.create_index("canonical_salt_key")
    collection.create_index("salt_composition_hash")
    collection.create_index([("generic_name", "text")])
    print("[SUCCESS] Indices created.")

if __name__ == "__main__":
    load_dotenv()
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/")
    CSV_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw", "janaushadhi_master.csv"))
    seed_database(CSV_FILE, MONGO_URI)