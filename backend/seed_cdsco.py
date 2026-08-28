import os
import pandas as pd
from dotenv import load_dotenv  # type: ignore
from pymongo import MongoClient, UpdateOne  # type: ignore

# 1. Load Environment Variables & Connect
load_dotenv()
mongo_uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/")
db_name = os.getenv("DB_NAME", "genmed_db")

client = MongoClient(mongo_uri)
db = client[db_name]
collection = db["cdsco_regulations"]

print(f"Seeding CDSCO Regulations into database: '{db_name}'...")

# -------------------------------------------------------------------------
# 2. READ CDSCO REGULATIONS FROM CSV
# -------------------------------------------------------------------------
csv_path = "data/raw/cdsco_master_list.csv"

operations = []
if os.path.exists(csv_path):
    print(f"Reading from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    for _, row in df.iterrows():
        rule_type = str(row.get("rule_type", "")).strip()
        status = str(row.get("status", "")).strip()
        message = str(row.get("message", "")).strip()
        
        if rule_type == "BANNED_FDC":
            csk = str(row.get("canonical_salt_key", "")).strip()
            if csk and csk != "nan":
                operations.append(
                    UpdateOne(
                        {"rule_type": rule_type, "canonical_salt_key": csk},
                        {"$set": {
                            "rule_type": rule_type,
                            "canonical_salt_key": csk,
                            "status": status,
                            "message": message
                        }},
                        upsert=True
                    )
                )
        elif rule_type == "SCHEDULE_H1":
            drug_name = str(row.get("drug_name", "")).strip()
            if drug_name and drug_name != "nan":
                operations.append(
                    UpdateOne(
                        {"rule_type": rule_type, "drug_name": drug_name},
                        {"$set": {
                            "rule_type": rule_type,
                            "drug_name": drug_name,
                            "status": status,
                            "message": message
                        }},
                        upsert=True
                    )
                )
else:
    print(f"Warning: {csv_path} not found. Skipping CSV import. Please ensure the file exists.")

# -------------------------------------------------------------------------
# 3. UPSERT DATA
# -------------------------------------------------------------------------
if operations:
    result = collection.bulk_write(operations)
    print(f"Upserted {result.upserted_count} new documents.")
    print(f"Modified {result.modified_count} existing documents.")
else:
    print("No operations to perform.")

# Create indices for performance
collection.create_index("rule_type")
collection.create_index("canonical_salt_key")
collection.create_index("drug_name")

print("SEEDING COMPLETE!")
