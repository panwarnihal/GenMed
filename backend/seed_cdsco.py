import os
from dotenv import load_dotenv  # type: ignore
from pymongo import MongoClient, UpdateOne  # type: ignore

# 1. Load Environment Variables & Connect
load_dotenv()
mongo_uri = os.getenv("MONGO_URI")
db_name = os.getenv("DB_NAME", "genmed_db")

client = MongoClient(mongo_uri)
db = client[db_name]
collection = db["cdsco_regulations"]

print(f"Seeding CDSCO Regulations into database: '{db_name}'...")

# -------------------------------------------------------------------------
# 2. DEFINE CDSCO REGULATIONS (Comprehensive Official Master Ruleset)
# -------------------------------------------------------------------------
banned_fdcs = [
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "nimesulide|pioglitazone", "status": "BANNED", "message": "Contains Banned FDC (nimesulide|pioglitazone). Gazette Alert: Prohibited formulation. DO NOT CONSUME."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "chlorpheniramine|paracetamol|phenylephrine", "status": "BANNED", "message": "Contains Banned FDC (chlorpheniramine|paracetamol|phenylephrine). Gazette Alert: Prohibited combination. DO NOT CONSUME."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "amoxicillin|dicloxacillin", "status": "BANNED", "message": "Contains Banned FDC (amoxicillin|dicloxacillin). Gazette Alert: Irrational antibiotic combination. DO NOT CONSUME."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "cetirizine|nimesulide", "status": "BANNED", "message": "Contains Banned FDC (cetirizine|nimesulide). Gazette Alert: High hepatotoxicity risk. DO NOT CONSUME."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "paracetamol|tapentadol", "status": "BANNED", "message": "Contains Banned FDC (paracetamol|tapentadol). Gazette Alert: Banned due to severe central nervous system risks."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "aceclofenac|paracetamol|rabeprazole", "status": "BANNED", "message": "Contains Banned FDC (aceclofenac|paracetamol|rabeprazole). Gazette Alert: Irrational triple combination. DO NOT CONSUME."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "chlorpheniramine|codeine", "status": "BANNED", "message": "Contains Banned FDC (codeine|chlorpheniramine syrup). Gazette Alert: Banned for pediatric use due to dependence risks."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "nimesulide|paracetamol", "status": "BANNED", "message": "Contains Banned FDC (nimesulide|paracetamol suspension). Gazette Alert: Banned for children under 12 years."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "chlorpheniramine|dextromethorphan|paracetamol", "status": "BANNED", "message": "Contains Banned FDC (cough & cold combo). Gazette Alert: Unsafe pediatric FDC. DO NOT CONSUME."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "ofloxacin|ornidazole|terbinafine", "status": "BANNED", "message": "Contains Banned FDC (ofloxacin|ornidazole|terbinafine). Gazette Alert: Irrational multi-antimicrobial/antifungal."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "gliclazide|metformin|pioglitazone", "status": "BANNED", "message": "Contains Banned FDC (triple anti-diabetic). Gazette Alert: Increased risk of fluid retention and cardiac event."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "caffeine|paracetamol|phenylephrine", "status": "BANNED", "message": "Contains Banned FDC (caffeine|paracetamol|phenylephrine). Gazette Alert: Prohibited cold formulation. DO NOT CONSUME."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "analgin|paracetamol", "status": "BANNED", "message": "Contains Banned FDC (analgin|paracetamol). Gazette Alert: Risk of agranulocytosis. DO NOT CONSUME."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "cyproheptadine|lysine", "status": "BANNED", "message": "Contains Banned FDC (cyproheptadine|lysine syrup). Gazette Alert: Prohibited appetite stimulant combination."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "azithromycin|cefixime", "status": "BANNED", "message": "Contains Banned FDC (azithromycin|cefixime). Gazette Alert: Irrational dual antibiotic leading to resistance."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "metronidazole|norfloxacin", "status": "BANNED", "message": "Contains Banned FDC (norfloxacin|metronidazole fixed dose). Gazette Alert: Prohibited anti-diarrheal combo."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "ciprofloxacin|fluconazole", "status": "BANNED", "message": "Contains Banned FDC (ciprofloxacin|fluconazole). Gazette Alert: Irrational antibacterial/antifungal combination."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "paracetamol|phenylephrine|triprolidine", "status": "BANNED", "message": "Contains Banned FDC (triple cold formulation). Gazette Alert: Prohibited FDC."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "dicyclomine|paracetamol|tramadol", "status": "BANNED", "message": "Contains Banned FDC (triple analgesic/antispasmodic). Gazette Alert: Banned FDC under CDSCO notification."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "dicyclomine|ranitidine", "status": "BANNED", "message": "Contains Banned FDC (dicyclomine|ranitidine). Gazette Alert: Irrational antacid-antispasmodic combination."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "omeprazole|paracetamol", "status": "BANNED", "message": "Contains Banned FDC (omeprazole|paracetamol). Gazette Alert: Prohibited irrational FDC."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "domperidone|paracetamol", "status": "BANNED", "message": "Contains Banned FDC (domperidone|paracetamol). Gazette Alert: Prohibited fixed antiemetic-analgesic FDC."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "salbutamol|theophylline", "status": "BANNED", "message": "Contains Banned FDC (salbutamol|theophylline). Gazette Alert: Cardiotoxicity risk in pediatric asthma care."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "betamethasone|clotrimazole|neomycin", "status": "BANNED", "message": "Contains Banned FDC (triple steroid/antifungal/antibacterial cream). Gazette Alert: Severe topical abuse risk."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "clobetasol|gentamicin|miconazole", "status": "BANNED", "message": "Contains Banned FDC (quadruple topical formulation). Gazette Alert: Unregulated steroid abuse hazard."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "gliclazide|metformin|rosiglitazone", "status": "BANNED", "message": "Contains Banned FDC (rosiglitazone combination). Gazette Alert: Cardiovascular contraindication alert."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "glimepiride|pioglitazone|rosiglitazone", "status": "BANNED", "message": "Contains Banned FDC (triple glitazone combination). Gazette Alert: Prohibited anti-diabetic FDC."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "naproxen|paracetamol", "status": "BANNED", "message": "Contains Banned FDC (naproxen|paracetamol). Gazette Alert: Dual NSAID toxicity hazard."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "caffeine|ibuprofen|paracetamol", "status": "BANNED", "message": "Contains Banned FDC (ibuprofen|paracetamol|caffeine). Gazette Alert: Prohibited multi-analgesic combo."},
    {"rule_type": "BANNED_FDC", "canonical_salt_key": "ketoprofen|paracetamol", "status": "BANNED", "message": "Contains Banned FDC (ketoprofen|paracetamol). Gazette Alert: Severe gastrointestinal bleeding risk."}
]

schedule_h1_drugs = [
    {"rule_type": "SCHEDULE_H1", "drug_name": "moxifloxacin", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (moxifloxacin). Requires red line prescription warning & chemist register entry."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "cefixime", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (cefixime). Requires red line prescription warning & chemist register entry."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "tramadol", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (tramadol). Strict prescription drug under NDPS/CDSCO Schedule H1 control."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "alprazolam", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (alprazolam). Psychotropic substance — strict prescription & mandatory record keeping."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "ketamine", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (ketamine). Controlled anesthetic substance — strictly regulated prescription item."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "buprenorphine", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (buprenorphine). Opioid prescription drug under strict H1 audit register."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "pentazocine", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (pentazocine). Narcotic analgesic — Schedule H1 registration mandatory."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "cefuroxime", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (cefuroxime). 2nd-gen cephalosporin — registered prescription required."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "ceftriaxone", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (ceftriaxone). 3rd-gen cephalosporin — strict prescription control."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "ceftazidime", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (ceftazidime). Reserve cephalosporin under CDSCO antimicrobial stewardship."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "cefepime", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (cefepime). 4th-gen cephalosporin — Schedule H1 prescription warning."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "meropenem", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (meropenem). Reserve Carbapenem antibiotic — strictly audited prescription."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "imipenem", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (imipenem). Reserve Carbapenem — hospital/registered prescription only."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "colistin", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (colistin). Critical last-resort antibiotic under strict CDSCO watch."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "clindamycin", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (clindamycin). Lincosamide antibiotic — registered prescription required."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "linezolid", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (linezolid). Oxazolidinone antibiotic under Schedule H1 registry rules."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "vancomycin", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (vancomycin). Glycopeptide antibiotic — Schedule H1 audit entry required."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "faropenem", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (faropenem). Penem antibiotic — mandatory prescription log retention."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "diazepam", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (diazepam). Benzodiazepine — strict prescription & chemist register entry."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "lorazepam", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (lorazepam). Benzodiazepine anxiolytic — Schedule H1 prescription rules apply."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "clobazam", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (clobazam). Anti-epileptic/anxiolytic — controlled prescription drug."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "nitrazepam", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (nitrazepam). Hypnotic sedative — mandatory Schedule H1 logbook registration."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "zolpidem", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (zolpidem). Non-benzodiazepine hypnotic — strict prescription required."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "chlordiazepoxide", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (chlordiazepoxide). Anxiolytic under CDSCO Schedule H1 control."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "etizolam", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (etizolam). Thienodiazepine derivative — controlled prescription item."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "codeine", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (codeine formulation). Opioid derivative — strict prescription log required."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "morphine", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (morphine). Potent narcotic analgesic — strict NDPS & H1 registry control."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "fentanyl", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (fentanyl). Synthetic opioid — specialized hospital prescription register."},
    {"rule_type": "SCHEDULE_H1", "drug_name": "tapentadol", "status": "SCHEDULE_H1", "message": "Contains Schedule H1 Drug (tapentadol). Centrally acting opioid analgesic — Schedule H1 entry mandatory."}
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

