import os
import sys
import pandas as pd
from dotenv import load_dotenv  # type: ignore
from pymongo import MongoClient

# Ensure backend directory is in sys.path
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)
from utils_hasher import generate_canonical_salt_key

load_dotenv()
mongo_uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/")
db_name = os.getenv("DB_NAME", "genmed_db")

client = MongoClient(mongo_uri)
db = client[db_name]
collection = db["Branded_Drugs"]

csv_path = os.path.abspath(os.path.join(script_dir, "..", "data", "raw", "A_Z_medicines_dataset_of_India.csv"))
if not os.path.exists(csv_path):
    csv_path = "data/raw/A_Z_medicines_dataset_of_India.csv"

print(f"Loading A-Z Medicine Dataset from: {csv_path}...")
df = pd.read_csv(csv_path)
df = df[df["Is_discontinued"] == False] # Drop discontinued stock

documents = []
batch_size = 10000
total_inserted = 0

print(f"Preparing {len(df)} records into '{db_name}.Branded_Drugs'...")
for row in df.itertuples(index=False):
    comp1 = str(getattr(row, 'short_composition1', '')) if pd.notna(getattr(row, 'short_composition1', None)) else ""
    comp2 = str(getattr(row, 'short_composition2', '')) if pd.notna(getattr(row, 'short_composition2', None)) else ""
    full_comp = f"{comp1} + {comp2}".strip(" +")
    
    try:
        price = float(getattr(row, '_5', 0.0) if hasattr(row, '_5') else getattr(row, 'price(₹)', 0.0))
    except (ValueError, TypeError):
        price = 0.0

    documents.append({
        "brand_name": getattr(row, 'name', ''),
        "manufacturer": getattr(row, 'manufacturer_name', ''),
        "printed_mrp": price,
        "pack_size": getattr(row, 'pack_size_label', ''),
        "raw_composition": full_comp,
        "canonical_salt_key": generate_canonical_salt_key(full_comp)
    })
    
    if len(documents) >= batch_size:
        collection.insert_many(documents)
        total_inserted += len(documents)
        print(f"Inserted {total_inserted}/{len(df)} records...")
        documents = []

if documents:
    collection.insert_many(documents)
    total_inserted += len(documents)

print(f"Total inserted: {total_inserted} records into Branded_Drugs.")
print("Creating indexes...")
collection.create_index("brand_name")
collection.create_index("canonical_salt_key")
print("Seeding complete.")
