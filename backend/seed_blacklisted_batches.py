import os
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne

load_dotenv()
mongo_uri = os.getenv("MONGO_URI")
db_name = os.getenv("DB_NAME", "genmed_db")

client = MongoClient(mongo_uri)
db = client[db_name]
collection = db["Blacklisted_Batches"]

print(f"Seeding Blacklisted Batches into database: '{db_name}'...")

blacklisted_batches = [
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
    },
    {
        "drug_name": "Telmisartan 40mg Tablets",
        "batch_number": "TEL2026-88B",
        "manufacturer_on_label": "Apex Healthcare Solutions",
        "reason_for_recall": "Not of Standard Quality (NSQ) - Failed assay of active ingredient",
        "alert_month": "August 2026"
    },
    {
        "drug_name": "Pantoprazole Injection 40mg",
        "batch_number": "PNT-9901X",
        "manufacturer_on_label": "LifeLine Parenterals",
        "reason_for_recall": "Particulate matter detected in liquid vial (Sterility failure)",
        "alert_month": "August 2026"
    },
    {
        "drug_name": "Paracetamol 650mg Tablets",
        "batch_number": "PCM650-2026-11",
        "manufacturer_on_label": "Star Remedies Pvt Ltd",
        "reason_for_recall": "Not of Standard Quality (NSQ) - Disintegration time failure",
        "alert_month": "July 2026"
    },
    {
        "drug_name": "Ciprofloxacin 500mg",
        "batch_number": "CIP500-7712",
        "manufacturer_on_label": "MedTech Formulations",
        "reason_for_recall": "Sub-standard potency - Active content below statutory threshold",
        "alert_month": "July 2026"
    },
    {
        "drug_name": "Montelukast 10mg Tablets",
        "batch_number": "MLK10-449A",
        "manufacturer_on_label": "Biovision Remedies",
        "reason_for_recall": "Not of Standard Quality (NSQ) - Related substances test failed",
        "alert_month": "June 2026"
    },
    {
        "drug_name": "Metformin 500mg SR",
        "batch_number": "MET500SR-809",
        "manufacturer_on_label": "Zenith Generic Labs",
        "reason_for_recall": "Dissolution test failure at 2-hour interval",
        "alert_month": "May 2026"
    },
    {
        "drug_name": "Ranitidine Injection 25mg/ml",
        "batch_number": "RNT25-3310",
        "manufacturer_on_label": "Global Parenterals",
        "reason_for_recall": "Presence of NDMA impurity above acceptable daily intake level",
        "alert_month": "May 2026"
    },
    {
        "drug_name": "Azithromycin 500mg Tablets",
        "batch_number": "AZT500-1092",
        "manufacturer_on_label": "Sunlight Pharma Ltd",
        "reason_for_recall": "Not of Standard Quality (NSQ) - Uniformity of dosage units failure",
        "alert_month": "April 2026"
    },
    {
        "drug_name": "Cefixime 200mg Oral Suspension",
        "batch_number": "CFX200-5561",
        "manufacturer_on_label": "PediaCare Formulations",
        "reason_for_recall": "Bacterial endotoxin failure in pediatric oral syrup suspension",
        "alert_month": "April 2026"
    },
    {
        "drug_name": "Omeprazole 20mg Capsules",
        "batch_number": "OMP20-8812",
        "manufacturer_on_label": "Vanguard Healthcare",
        "reason_for_recall": "Failed enteric coating acid resistance test",
        "alert_month": "March 2026"
    },
    {
        "drug_name": "Atorvastatin 10mg Tablets",
        "batch_number": "ATV10-7731",
        "manufacturer_on_label": "Cardinal Health Labs",
        "reason_for_recall": "Sub-potent batch - Active ingredient content at 68% of label claim",
        "alert_month": "March 2026"
    },
    {
        "drug_name": "Diclofenac Sodium Injection",
        "batch_number": "DCF-4029A",
        "manufacturer_on_label": "Precision Parenterals",
        "reason_for_recall": "pH variation beyond official pharmacopeial range",
        "alert_month": "February 2026"
    },
    {
        "drug_name": "Amoxyclav 625mg Tablets",
        "batch_number": "AMX625-992B",
        "manufacturer_on_label": "NovaMed Biologics",
        "reason_for_recall": "Not of Standard Quality (NSQ) - Moisture content exceeded limits",
        "alert_month": "February 2026"
    },
    {
        "drug_name": "Alprazolam 0.5mg Tablets",
        "batch_number": "ALP05-1102",
        "manufacturer_on_label": "NeuroCare Pharma",
        "reason_for_recall": "Counterfeit label alert - Spurious batch packaging detected in North Zone",
        "alert_month": "January 2026"
    },
    {
        "drug_name": "Cetirizine 10mg Syrup",
        "batch_number": "CTZ10-3341",
        "manufacturer_on_label": "SyrupCraft Remedies",
        "reason_for_recall": "Diethylene glycol / Ethylene glycol contamination screening alert",
        "alert_month": "January 2026"
    },
    {
        "drug_name": "Oflomac 200 (Spurious Counterfeit)",
        "batch_number": "OFM200-99X",
        "manufacturer_on_label": "Macleods (Spurious Counterfeit Packaging)",
        "reason_for_recall": "Spurious drug alert issued by CDSCO West Zone",
        "alert_month": "August 2026"
    },
    {
        "drug_name": "Losartan Potassium 50mg",
        "batch_number": "LST50-5012",
        "manufacturer_on_label": "CardioLife Sciences",
        "reason_for_recall": "Azido impurity detected above limit",
        "alert_month": "July 2026"
    },
    {
        "drug_name": "Levofloxacin 500mg Infusion",
        "batch_number": "LVF500-2210",
        "manufacturer_on_label": "InfuseCare Ltd",
        "reason_for_recall": "Sterility test failure — fungal contamination detected",
        "alert_month": "June 2026"
    }
]

operations = []
for batch in blacklisted_batches:
    operations.append(
        UpdateOne(
            {"batch_number": batch["batch_number"]},
            {"$set": batch},
            upsert=True
        )
    )

if operations:
    result = collection.bulk_write(operations)
    print(f"Upserted {result.upserted_count} new documents.")
    print(f"Modified {result.modified_count} existing documents.")

collection.create_index("batch_number")
print("BLACKLISTED BATCHES SEEDING COMPLETE!")
