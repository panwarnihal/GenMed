import os
from dotenv import load_dotenv
from pymongo import MongoClient
from utils_hasher import generate_salt_hash

# 1. Load Environment Variables & Connect
load_dotenv()
mongo_uri = os.getenv("MONGO_URI")
db_name = os.getenv("DB_NAME", "genmed_db")

client = MongoClient(mongo_uri)
db = client[db_name]

print(f"⏳ Seeding data into database: '{db_name}'...")

# -------------------------------------------------------------------------
# 2. DEFINE BRANDED DRUGS INVENTORY
# -------------------------------------------------------------------------
branded_drugs_data = [
    {
        "brand_name": "Brilinta 90mg",
        "manufacturer": "AstraZeneca",
        "mrp_price": 900.0,
        "active_ingredients": [
            {"salt": "Ticagrelor", "strength": "90mg"}
        ]
    },
    {
        "brand_name": "Augmentin 625 Duo",
        "manufacturer": "GSK",
        "mrp_price": 200.0,
        "active_ingredients": [
            {"salt": "Clavulanic Acid", "strength": "125mg"},
            {"salt": "Amoxicillin", "strength": "500mg"}
        ]
    },
    {
        "brand_name": "Lipitor 10mg",
        "manufacturer": "Pfizer",
        "mrp_price": 160.0,
        "active_ingredients": [
            {"salt": "Atorvastatin", "strength": "10mg"}
        ]
    }
]

# Compute SHA-256 hash for each branded drug
for drug in branded_drugs_data:
    salt_hash, canonical_str = generate_salt_hash(drug["active_ingredients"])
    drug["salt_composition_hash"] = salt_hash
    drug["canonical_salt_string"] = canonical_str

# -------------------------------------------------------------------------
# 3. DEFINE PMBJP GENERIC INVENTORY (Jan Aushadhi)
# -------------------------------------------------------------------------
generic_inventory_data = [
    {
        "drug_code": "PMBI-1087",
        "generic_name": "Ticagrelor Tablets 90 mg",
        "jan_aushadhi_price": 100.0,
        "unit_size": "10 Tablets",
        "active_ingredients": [
            {"salt": "Ticagrelor", "strength": "90mg"}
        ]
    },
    {
        "drug_code": "PMBI-0421",
        "generic_name": "Amoxicillin & Potassium Clavulanate Tablets 625 mg",
        "jan_aushadhi_price": 50.0,
        "unit_size": "10 Tablets",
        # Notice we put salts in reverse order to prove our alphabetical sorter works!
        "active_ingredients": [
            {"salt": "Amoxicillin", "strength": "500mg"},
            {"salt": "Clavulanic Acid", "strength": "125mg"}
        ]
    },
    {
        "drug_code": "PMBI-0215",
        "generic_name": "Atorvastatin Tablets 10 mg",
        "jan_aushadhi_price": 15.0,
        "unit_size": "10 Tablets",
        "active_ingredients": [
            {"salt": "Atorvastatin", "strength": "10mg"}
        ]
    }
]

# Compute SHA-256 hash for each generic drug
for drug in generic_inventory_data:
    salt_hash, canonical_str = generate_salt_hash(drug["active_ingredients"])
    drug["salt_composition_hash"] = salt_hash
    drug["canonical_salt_string"] = canonical_str

# -------------------------------------------------------------------------
# 4. DEFINE CDSCO BLACKLISTED BATCHES (OSINT Spurious Drug Alert Data)
# -------------------------------------------------------------------------
blacklisted_batches_data = [
    {
        "drug_name": "Brilinta 90mg (Counterfeit Alert)",
        "batch_number": "BT1089X",
        "manufacturer_on_label": "AstraZeneca (Spurious Label)",
        "reason_for_recall": "Spurious / Counterfeit batch detected by CDSCO North Zone",
        "alert_month": "July 2026"
    },
    {
        "drug_name": "Amoxicillin 500mg",
        "batch_number": "AMX2026-04",
        "manufacturer_on_label": "Generic Pharma Ltd",
        "reason_for_recall": "Not of Standard Quality (NSQ) - Failed dissolution test",
        "alert_month": "June 2026"
    }
]

# -------------------------------------------------------------------------
# 5. CLEAR EXISTING & INSERT SEED DATA
# -------------------------------------------------------------------------
db["Branded_Drugs"].delete_many({})
db["Generic_Inventory"].delete_many({})
db["Blacklisted_Batches"].delete_many({})

db["Branded_Drugs"].insert_many(branded_drugs_data)
db["Generic_Inventory"].insert_many(generic_inventory_data)
db["Blacklisted_Batches"].insert_many(blacklisted_batches_data)

# Create an index on `salt_composition_hash` for lightning-fast deterministic matching
db["Branded_Drugs"].create_index("salt_composition_hash")
db["Generic_Inventory"].create_index("salt_composition_hash")
db["Blacklisted_Batches"].create_index("batch_number")

print("✅ SEEDING COMPLETE!")
print(f"   • Inserted {len(branded_drugs_data)} Branded Drugs")
print(f"   • Inserted {len(generic_inventory_data)} PMBJP Generic Equivalent Drugs")
print(f"   • Inserted {len(blacklisted_batches_data)} CDSCO Blacklisted Batches")
print("✅ Created SHA-256 Hash Indexes successfully!")