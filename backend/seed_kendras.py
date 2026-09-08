import os
from pymongo import MongoClient, GEOSPHERE

# Using realistic coordinates for Delhi NCR / Ghaziabad area
MOCK_KENDRAS = [
    {
        "store_name": "PMBJP Kendra - Indirapuram",
        "address": "Shop No. 12, Aditya Mall, Indirapuram, Ghaziabad",
        "contact_number": "+91-9876543210",
        "location": {
            "type": "Point",
            "coordinates": [77.3712, 28.6366] # [longitude, latitude]
        }
    },
    {
        "store_name": "PMBJP Kendra - Vaishali",
        "address": "Sector 4, Vaishali, Ghaziabad",
        "contact_number": "+91-9876543211",
        "location": {
            "type": "Point",
            "coordinates": [77.3370, 28.6480]
        }
    },
    {
        "store_name": "PMBJP Kendra - Connaught Place",
        "address": "Palika Bazar, Connaught Place, New Delhi",
        "contact_number": "+91-9876543212",
        "location": {
            "type": "Point",
            "coordinates": [77.2167, 28.6304]
        }
    },
    {
        "store_name": "PMBJP Kendra - Noida Sector 18",
        "address": "Atta Market, Sector 18, Noida",
        "contact_number": "+91-9876543213",
        "location": {
            "type": "Point",
            "coordinates": [77.3242, 28.5707]
        }
    },
    {
        "store_name": "PMBJP Kendra - Mayur Vihar",
        "address": "Phase 1, Mayur Vihar, New Delhi",
        "contact_number": "+91-9876543214",
        "location": {
            "type": "Point",
            "coordinates": [77.2945, 28.6045]
        }
    }
]

def seed_database():
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME = os.getenv("DB_NAME", "genmed_db")

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    kendras_collection = db["Kendras"]

    print("Dropping existing Kendras collection...")
    db.drop_collection("Kendras")

    print("Inserting mock Kendras...")
    kendras_collection.insert_many(MOCK_KENDRAS)

    print("Creating 2dsphere index on location...")
    kendras_collection.create_index([("location", GEOSPHERE)])

    print(f"Successfully seeded {len(MOCK_KENDRAS)} PMBJK stores!")
    client.close()

if __name__ == "__main__":
    seed_database()
