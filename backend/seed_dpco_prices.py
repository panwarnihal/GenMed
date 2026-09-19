import os
import csv
from pymongo import MongoClient
from dotenv import load_dotenv

# Ensure we can import utils_hasher when running as a script
import sys
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)

from utils_hasher import generate_canonical_salt_key

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/")
DB_NAME = os.getenv("DB_NAME", "genmed_db")
CSV_PATH = os.path.join(script_dir, "..", "data", "raw", "nppa_dpco_prices.csv")

def seed():
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    collection = db["DPCO_Prices"]
    
    print("Dropping existing DPCO_Prices collection...")
    collection.drop()
    
    records = []
    
    if not os.path.exists(CSV_PATH):
        print(f"Error: CSV file not found at {CSV_PATH}")
        return
        
    print(f"Reading DPCO prices from {CSV_PATH}...")
    with open(CSV_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_salt = row.get("salt_composition", "").strip()
            raw_price = row.get("ceiling_price", "").strip()
            
            if not raw_salt or not raw_price:
                continue
                
            try:
                price_float = float(raw_price)
            except ValueError:
                print(f"Warning: Could not parse price '{raw_price}' for '{raw_salt}'")
                continue
                
            canonical_key = generate_canonical_salt_key(raw_salt)
            records.append({
                "canonical_salt_key": canonical_key,
                "ceiling_price": price_float,
                "original_salt": raw_salt
            })
            
    if records:
        print(f"Inserting {len(records)} records into MongoDB...")
        collection.insert_many(records)
        print("Creating index on canonical_salt_key...")
        collection.create_index("canonical_salt_key")
        
    print(f"Successfully seeded {len(records)} DPCO ceiling prices into MongoDB collection '{DB_NAME}.DPCO_Prices'.")

if __name__ == "__main__":
    seed()
