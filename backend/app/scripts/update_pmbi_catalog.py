import os
import sys
import requests
import pandas as pd
from bs4 import BeautifulSoup
from pymongo import MongoClient, UpdateOne
import io

# Add backend directory to sys.path so we can import utils_hasher
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from utils_hasher import generate_canonical_salt_key

def fetch_latest_pmbi_data():
    """
    Scrapes the latest PMBI/Jan Aushadhi catalog.
    Uses pandas to extract the HTML table from the ProductList.aspx page.
    """
    print("🔄 Fetching latest PMBI catalog...")
    url = "https://janaushadhi.gov.in/ProductList.aspx" 
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        # Parse HTML tables using pandas
        tables = pd.read_html(io.StringIO(response.text))
        
        if not tables:
            print("❌ No tables found on the PMBI page.")
            return None

        # The product list is typically the largest/first table
        df = tables[0]
        
        # Clean column names to match expected format (e.g., stripping whitespace)
        df.columns = [str(c).strip() for c in df.columns]

        print(f"✅ Successfully fetched PMBI data. Found {len(df)} records.")
        return df

    except Exception as e:
        print(f"❌ Error fetching PMBI data: {e}")
        return None

def upsert_to_atlas(df: pd.DataFrame):
    """
    Processes the dataframe and safely upserts to MongoDB Atlas without dropping indexes.
    """
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("❌ Error: MONGO_URI environment variable is not set.")
        return
        
    try:
        client = MongoClient(mongo_uri)
        collection = client["genmed_db"]["Generic_Inventory"]
        
        operations = []
        
        for _, row in df.iterrows():
            # Adjust these column names based on the actual PMBI table headers
            drug_code = str(row.get("Drug Code", "")).strip()
            generic_name = str(row.get("Generic Name", "")).strip()
            
            # Sometimes the price column might have a different name, like 'MRP (Rs.)' or similar.
            mrp_val = row.get("Unit Size", row.get("MRP", 0.0)) # Fallbacks if needed
            # For this example, let's look for any column containing 'MRP'
            mrp_col = next((col for col in df.columns if 'MRP' in col.upper()), None)
            if mrp_col:
                mrp_val = row.get(mrp_col, 0.0)
            
            try:
                mrp = float(mrp_val)
            except (ValueError, TypeError):
                mrp = 0.0
                
            if not generic_name or generic_name == "nan":
                continue # Skip empty rows
                
            # 1. Generate the canonical key
            canonical_key = generate_canonical_salt_key(generic_name)
            
            # 2. Prepare the document
            doc = {
                "drug_code": drug_code,
                "generic_name": generic_name,
                "canonical_salt_key": canonical_key,
                "jan_aushadhi_price": mrp
            }
            
            # 3. Create the Upsert operation (Updates if exists, Inserts if new)
            # Upsert based on canonical salt key to ensure we don't duplicate the same formulation
            operations.append(
                UpdateOne({"canonical_salt_key": canonical_key}, {"$set": doc}, upsert=True)
            )
            
        if operations:
            print(f"📦 Pushing {len(operations)} updates to MongoDB Atlas...")
            result = collection.bulk_write(operations)
            print(f"✅ Upsert Complete! Modified: {result.modified_count}, Added: {result.upserted_count}")
        else:
            print("⚠️ No valid operations to perform.")
            
    except Exception as e:
         print(f"❌ Database Error: {e}")

if __name__ == "__main__":
    df = fetch_latest_pmbi_data()
    if df is not None and not df.empty:
        upsert_to_atlas(df)
    else:
        print("⚠️ Skipping DB upsert due to empty or failed data fetch.")
    
    print("🏁 Cron job finished.")
