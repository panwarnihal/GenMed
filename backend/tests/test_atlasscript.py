import os
import re
from dotenv import load_dotenv
from pymongo import MongoClient

from utils_hasher import generate_canonical_salt_key

load_dotenv()

# -----------------------------------------------------------------------------
# 2. ATLAS SEARCH PIPELINE EXECUTION (Targeting Generic_Inventory)
# -----------------------------------------------------------------------------
def search_generic_alternative(mongo_uri: str, user_query: str):
    client = MongoClient(mongo_uri)
    db = client["genmed_db"]
    collection = db["Generic_Inventory"]  # Using your deployed collection name

    canonical_key = generate_canonical_salt_key(user_query)
    print(f"\n[QUERY] Raw Input       : '{user_query}'")
    print(f"[QUERY] Canonical Key   : '{canonical_key}'\n")

    # Aggregation Pipeline leveraging MongoDB Atlas Search
    pipeline = [
        {
            "$search": {
                "index": "default",
                "compound": {
                    "should": [
                        # Priority 1: Direct match on canonical salt key (Boosted)
                        {
                            "text": {
                                "query": canonical_key,
                                "path": "canonical_salt_key",
                                "score": {"boost": {"value": 5.0}}
                            }
                        },
                        # Priority 2: Fuzzy text match for OCR typos on generic name
                        {
                            "text": {
                                "query": user_query,
                                "path": "generic_name",
                                "fuzzy": {
                                    "maxEdits": 1,
                                    "prefixLength": 3
                                }
                            }
                        }
                    ],
                    "minimumShouldMatch": 1
                }
            }
        },
        # Project relevant fields + search relevance score
        {
            "$project": {
                "_id": 1,
                "drug_code": 1,
                "generic_name": 1,
                "canonical_salt_key": 1,
                "unit_size": 1,
                "jan_aushadhi_price": 1,
                "search_score": {"$meta": "searchScore"}
            }
        },
        {"$limit": 3}
    ]

    results = list(collection.aggregate(pipeline))

    if not results:
        print("[NO MATCH] No matching Jan Aushadhi generic alternative found.")
        return

    print("--- TOP MATCHES FROM ATLAS SEARCH ---")
    for idx, doc in enumerate(results, start=1):
        print(f"Match #{idx} (Score: {doc.get('search_score', 0.0):.2f})")
        print(f"  - Drug Code          : {doc.get('drug_code')}")
        print(f"  - Generic Name       : {doc.get('generic_name')}")
        print(f"  - Canonical Key      : {doc.get('canonical_salt_key')}")
        print(f"  - Unit Packaging     : {doc.get('unit_size')}")
        print(f"  - Jan Aushadhi Price : Rs. {doc.get('jan_aushadhi_price', 0.0):.2f}\n")


# -----------------------------------------------------------------------------
# 3. RUN TEST CASE
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority")
    
    # Test case: Intentional OCR typo + reversed salt order
    sample_query = "Clavulanic Acid 125 mg + Amoxiciln 500mg"
    search_generic_alternative(MONGO_URI, sample_query)