import pymongo  # type: ignore

MONGO_URI = "mongodb://127.0.0.1:27017/"
DB_NAME = "genmed_db"
COLLECTION_NAME = "Kendras"

kendras_data = [
    {"name": "PMBJK Nandgram", "address": "A 12, Bhagwan Parshuram Chowk, Nandgram", "coordinates": [77.4056, 28.6885]},
    {"name": "PMBJK Ashram Road", "address": "D-131, Ashram Rd, Nandgram, Ghukna", "coordinates": [77.4060, 28.6890]},
    {"name": "PMBJK Raj Nagar", "address": "B-01, RDC, Sector 15, Raj Nagar", "coordinates": [77.4460, 28.6805]},
    {"name": "PMBJK Siddharth Vihar", "address": "68, Gaur Siddhartham, Siddharth Vihar", "coordinates": [77.4190, 28.6270]},
    {"name": "PMBJK Vasundhara", "address": "686, Sector 2B, Vasundhara", "coordinates": [77.3750, 28.6650]}
]

def seed_failsafe_kendras():
    print("Connecting to MongoDB at", MONGO_URI)
    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    print(f"Dropping existing collection '{COLLECTION_NAME}'...")
    collection.drop()
    
    documents = []
    for item in kendras_data:
        doc = {
            "store_name": item["name"],
            "address": item["address"],
            "location": {
                "type": "Point",
                "coordinates": item["coordinates"]
            }
        }
        documents.append(doc)
        
    print(f"Inserting {len(documents)} Kendras into '{DB_NAME}.{COLLECTION_NAME}'...")
    collection.insert_many(documents)
    
    print("Creating 2dsphere index on the 'location' field...")
    collection.create_index([("location", pymongo.GEOSPHERE)])
    
    print("Seeding complete! Failsafe data is ready.")

if __name__ == "__main__":
    seed_failsafe_kendras()
