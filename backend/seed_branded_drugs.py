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
for _, row in df.iterrows():
    # Combine composition columns safely
    comp1 = str(row["short_composition1"]) if pd.notna(row["short_composition1"]) else ""
    comp2 = str(row["short_composition2"]) if pd.notna(row["short_composition2"]) else ""
    full_comp = f"{comp1} + {comp2}".strip(" +")
    
    documents.append({
        "brand_name": row["name"],
        "manufacturer": row["manufacturer_name"],
        "printed_mrp": float(row["price(₹)"]),
        "pack_size": row["pack_size_label"],
        "raw_composition": full_comp,
        "canonical_salt_key": generate_canonical_salt_key(full_comp)
    })

print(f"Inserting {len(documents)} records into Branded_Drugs...")
collection.insert_many(documents)
collection.create_index("brand_name")
collection.create_index("canonical_salt_key")
print("Seeding complete.")
