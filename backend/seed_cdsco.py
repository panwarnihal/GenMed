import os
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne

# 1. Load Environment Variables & Connect
load_dotenv()
mongo_uri = os.getenv("MONGO_URI")
db_name = os.getenv("DB_NAME", "genmed_db")

client = MongoClient(mongo_uri)
db = client[db_name]
collection = db["cdsco_regulations"]

print(f"Seeding CDSCO Regulations into database: '{db_name}'...")

# -------------------------------------------------------------------------
# 2. DEFINE CDSCO REGULATIONS
# -------------------------------------------------------------------------
banned_fdcs = [
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "nimesulide|pioglitazone", "status": "BANNED", "message": "Contains Banned FDC (nimesulide|pioglitazone). DO NOT CONSUME."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "chlorpheniramine|paracetamol|phenylephrine", "status": "BANNED", "message": "Contains Banned FDC (chlorpheniramine|paracetamol|phenylephrine). DO NOT CONSUME."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "amoxicillin|dicloxacillin", "status": "BANNED", "message": "Contains Banned FDC (amoxicillin|dicloxacillin). DO NOT CONSUME."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "cetirizine|nimesulide", "status": "BANNED", "message": "Contains Banned FDC (cetirizine|nimesulide). DO NOT CONSUME."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "paracetamol|tapentadol", "status": "BANNED", "message": "Contains Banned FDC (paracetamol|tapentadol). DO NOT CONSUME."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "aceclofenac|paracetamol|rabeprazole", "status": "BANNED", "message": "Contains Banned FDC (aceclofenac|paracetamol|rabeprazole). DO NOT CONSUME."} # Extra item
]

schedule_h1_drugs = [
    {"rule_type": "SCHEDULE_H1", "drug_name": "moxifloxacin", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (moxifloxacin). Valid prescription required."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "cefixime", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (cefixime). Valid prescription required."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "tramadol", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (tramadol). Valid prescription required."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "alprazolam", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (alprazolam). Valid prescription required."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "ketamine", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (ketamine). Valid prescription required."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "buprenorphine", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (buprenorphine). Valid prescription required."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "pentazocine", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (pentazocine). Valid prescription required."} # Extra item
]

# -------------------------------------------------------------------------
# 3. UPSERT DATA
# -------------------------------------------------------------------------
operations = []

for rule in banned_fdcs:
    operations.append(
        UpdateOne(
            {"rule_type": rule["rule_type"], "canonical_salt_key": rule["canonical_salt_key"]},
            {"$set": rule},
            upsert=True
        )
    )

for rule in schedule_h1_drugs:
    operations.append(
        UpdateOne(
            {"rule_type": rule["rule_type"], "drug_name": rule["drug_name"]},
            {"$set": rule},
            upsert=True
        )
    )

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
