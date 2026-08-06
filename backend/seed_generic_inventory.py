import os
import re
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne

load_dotenv()

def generate_canonical_salt_key(text: str) -> str:
    if not text or not isinstance(text, str):
        return ""
    text = text.lower()
    noise_patterns = [
        r'\bip\b', r'\bbp\b', r'\busp\b', r'\btrihydrate\b', r'\bhydrochloride\b',
        r'\bmaleate\b', r'\bsodium\b', r'\bpotassium\b', r'\btablet\b', r'\btablets\b',
        r'\bcapsule\b', r'\bcapsules\b', r'\bdispersible\b', r'\bsr\b', r'\ber\b',
        r'\bacid\b'
    ]
    for pattern in noise_patterns:
        text = re.sub(pattern, '', text)

    text = re.sub(r'\bamoxycillin\b', 'amoxicillin', text)
    text = re.sub(r'\bclavulanic\b', 'clavulanate', text)
    text = re.sub(r'\bacetaminophen\b', 'paracetamol', text)

    text = re.sub(r'(\d+)\s*(mg|gm|g|ml|mcg|iu)', r'\1\2', text)
    components = re.split(r'\s*\+\s*|\s+and\s+', text)
    clean_tokens = [re.sub(r'[^a-z0-9]', '', c) for c in components if c.strip()]
    clean_tokens.sort()
    return "|".join(clean_tokens)

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
        
        doc = {
            "drug_code": drug_code,
            "generic_name": generic_name,
            "canonical_salt_key": canonical_key,
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

if __name__ == "__main__":
    MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority")
    CSV_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw", "janaushadhi_master.csv"))
    seed_database(CSV_FILE, MONGO_URI)