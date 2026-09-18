import sys
import pandas as pd
from pymongo import MongoClient

# Ensure backend modules can be imported when running from root
sys.path.append("backend")
from utils_hasher import generate_canonical_salt_key

client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["genmed_db"]
collection = db["Branded_Drugs"]

print("Loading A-Z Medicine Dataset...")
df = pd.read_csv("data/raw/A_Z_medicines_dataset_of_India.csv")
df = df[df["Is_discontinued"] == False] # Drop discontinued stock

documents = []
batch_size = 10000
total_inserted = 0

print(f"Preparing {len(df)} records...")
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
