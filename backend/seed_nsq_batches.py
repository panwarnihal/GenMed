import os
import glob
import pandas as pd
from dotenv import load_dotenv  # type: ignore
from pymongo import MongoClient, UpdateOne  # type: ignore

# 1. Load Environment Variables & Connect
load_dotenv()
mongo_uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/")
db_name = os.getenv("DB_NAME", "genmed_db")

client = MongoClient(mongo_uri)
db = client[db_name]
collection = db["Blacklisted_Batches"]

print(f"Seeding Blacklisted Batches into database: '{db_name}'...")

# 2. Iterate over NSQ CSV files
script_dir = os.path.dirname(os.path.abspath(__file__))
nsq_dir = os.path.abspath(os.path.join(script_dir, "..", "data", "raw", "nsq_alerts"))
if not os.path.exists(nsq_dir):
    nsq_dir = "data/raw/nsq_alerts"
    print(f"Warning: Directory '{nsq_dir}' not found. Creating it now.")
    os.makedirs(nsq_dir, exist_ok=True)

csv_files = glob.glob(os.path.join(nsq_dir, "*.csv"))

if not csv_files:
    print(f"No CSV files found in {nsq_dir}. Please place monthly NSQ reports here.")
else:
    for file_path in csv_files:
        print(f"Parsing {file_path}...")
        try:
            df = pd.read_csv(file_path)
            
            for _, row in df.iterrows():
                batch_number = str(row.get("batch_number", "")).strip()
                manufacturer = str(row.get("manufacturer", "")).strip()
                medicine_name = str(row.get("medicine_name", "")).strip()
                failure_reason = str(row.get("failure_reason", "")).strip()
                
                if pd.notna(row.get("batch_number")) and batch_number and batch_number != "nan":
                    doc = {
                        "batch_number": batch_number,
                        "manufacturer": manufacturer,
                    }
                    if medicine_name and medicine_name != "nan":
                        doc["medicine_name"] = medicine_name
                    if failure_reason and failure_reason != "nan":
                        doc["failure_reason"] = failure_reason
                    
                    operations.append(
                        UpdateOne(
                            {"batch_number": batch_number},
                            {"$set": doc},
                            upsert=True
                        )
                    )
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")

# 3. UPSERT DATA
if operations:
    result = collection.bulk_write(operations)
    print(f"Upserted {result.upserted_count} new documents.")
    print(f"Modified {result.modified_count} existing documents.")
else:
    print("No operations to perform.")

collection.create_index("batch_number")
print("BLACKLISTED BATCHES SEEDING COMPLETE!")
