import os
from dotenv import load_dotenv
from pymongo import MongoClient, GEOSPHERE

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "genmed_db")

DEMO_KENDRAS = [
    # ---------------------------------------------------------
    # HYPER-LOCAL: CHRIST Delhi NCR Proximity (Ghaziabad Core)
    # ---------------------------------------------------------
    {"store_name": "PMBJP Kendra, Mariam Nagar", "address": "Opp. CHRIST University, Meerut Road, Ghaziabad", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.4110, 28.6740]}},
    {"store_name": "Jan Aushadhi Store, Raj Nagar Ext", "address": "Near VVIP Addresses, Raj Nagar Extension, Ghaziabad", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.4280, 28.6920]}},
    {"store_name": "PMBJP Pharmacy, Sihani Gate", "address": "Sihani Gate Police Station Road, Ghaziabad", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.4250, 28.6720]}},
    {"store_name": "Jan Aushadhi Kendra, Patel Nagar", "address": "Sector 7, Patel Nagar, Ghaziabad", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.4320, 28.6650]}},
    {"store_name": "PMBJP Store, Kavi Nagar", "address": "C-Block Market, Kavi Nagar, Ghaziabad", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.4450, 28.6680]}},
    {"store_name": "Jan Aushadhi Pharmacy, Meerut Road Ind. Area", "address": "Meerut Road Industrial Area, Ghaziabad", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.4180, 28.6850]}},
    {"store_name": "PMBJP Kendra, Nandgram", "address": "Main Market, Nandgram, Ghaziabad", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.4150, 28.6820]}},
    {"store_name": "Jan Aushadhi Store, Sanjay Nagar", "address": "Sector 23, Sanjay Nagar, Ghaziabad", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.4500, 28.6800]}},
    {"store_name": "PMBJP Pharmacy, Govindpuram", "address": "Main Market, Govindpuram, Ghaziabad", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.4800, 28.6700]}},
    {"store_name": "Jan Aushadhi Kendra, Pratap Vihar", "address": "Sector 11, Pratap Vihar, Ghaziabad", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.4050, 28.6250]}},
    {"store_name": "PMBJP Store, Dasna", "address": "Dasna Toll Plaza Road, Ghaziabad", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.5100, 28.6800]}},
    {"store_name": "Jan Aushadhi Pharmacy, Muradnagar", "address": "Main Delhi-Meerut Highway, Muradnagar", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.4950, 28.7650]}},

    # ---------------------------------------------------------
    # GHAZIABAD OUTSKIRTS & NOIDA BORDER
    # ---------------------------------------------------------
    {"store_name": "Jan Aushadhi Store, Raj Nagar", "address": "RDC, Raj Nagar, Ghaziabad, UP", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.4350, 28.6700]}},
    {"store_name": "PMBJP Pharmacy, Indirapuram", "address": "Habitat Centre, Indirapuram, Ghaziabad, UP", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.3680, 28.6400]}},
    {"store_name": "Jan Aushadhi Kendra, Vaishali", "address": "Sector 4, Vaishali, Ghaziabad, UP", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.3400, 28.6500]}},
    {"store_name": "PMBJP Kendra, Vasundhara", "address": "Sector 10, Vasundhara, Ghaziabad, UP", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.3600, 28.6550]}},
    {"store_name": "PMBJP Kendra, Mohan Nagar", "address": "Mohan Nagar Link Road, Ghaziabad, UP", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.3950, 28.6750]}},

    # ---------------------------------------------------------
    # DELHI - EAST, NORTH & CENTRAL
    # ---------------------------------------------------------
    {"store_name": "PMBJP Kendra, AIIMS", "address": "AIIMS Campus, Ansari Nagar, New Delhi", "state": "Delhi", "location": {"type": "Point", "coordinates": [77.2090, 28.5660]}},
    {"store_name": "Jan Aushadhi Store, Safdarjung", "address": "Safdarjung Hospital Enclave, New Delhi", "state": "Delhi", "location": {"type": "Point", "coordinates": [77.2050, 28.5680]}},
    {"store_name": "PMBJP Pharmacy, RML Hospital", "address": "RML Hospital, Baba Kharak Singh Marg, New Delhi", "state": "Delhi", "location": {"type": "Point", "coordinates": [77.2010, 28.6250]}},
    {"store_name": "Jan Aushadhi Kendra, CP", "address": "Radial Road, Connaught Place, New Delhi", "state": "Delhi", "location": {"type": "Point", "coordinates": [77.2167, 28.6328]}},
    {"store_name": "PMBJP Kendra, Lajpat Nagar", "address": "Central Market, Lajpat Nagar, New Delhi", "state": "Delhi", "location": {"type": "Point", "coordinates": [77.2400, 28.5700]}},
    {"store_name": "Jan Aushadhi Store, Saket", "address": "Near Max Hospital, Saket, New Delhi", "state": "Delhi", "location": {"type": "Point", "coordinates": [77.2100, 28.5200]}},
    {"store_name": "PMBJP Kendra, Dilshad Garden", "address": "GTB Hospital Campus, Dilshad Garden, New Delhi", "state": "Delhi", "location": {"type": "Point", "coordinates": [77.3200, 28.6800]}},
    {"store_name": "PMBJP Pharmacy, Seemapuri", "address": "Border Checkpost, Seemapuri, New Delhi", "state": "Delhi", "location": {"type": "Point", "coordinates": [77.3250, 28.6800]}},
    {"store_name": "Jan Aushadhi Store, Anand Vihar", "address": "ISBT Anand Vihar, New Delhi", "state": "Delhi", "location": {"type": "Point", "coordinates": [77.3150, 28.6460]}},
    {"store_name": "Jan Aushadhi Kendra, Mayur Vihar", "address": "Phase 1, Mayur Vihar, New Delhi", "state": "Delhi", "location": {"type": "Point", "coordinates": [77.2950, 28.6050]}},
    {"store_name": "PMBJP Pharmacy, Karol Bagh", "address": "Arya Samaj Road, Karol Bagh, New Delhi", "state": "Delhi", "location": {"type": "Point", "coordinates": [77.1900, 28.6500]}},
    {"store_name": "Jan Aushadhi Store, Rohini", "address": "Sector 3, Rohini, New Delhi", "state": "Delhi", "location": {"type": "Point", "coordinates": [77.1150, 28.7000]}},
    
    # ---------------------------------------------------------
    # DELHI - WEST
    # ---------------------------------------------------------
    {"store_name": "PMBJP Kendra, Dwarka", "address": "Sector 10 Market, Dwarka, New Delhi", "state": "Delhi", "location": {"type": "Point", "coordinates": [77.0600, 28.5800]}},
    {"store_name": "Jan Aushadhi Store, Janakpuri", "address": "District Centre, Janakpuri, New Delhi", "state": "Delhi", "location": {"type": "Point", "coordinates": [77.0900, 28.6200]}},

    # ---------------------------------------------------------
    # NOIDA
    # ---------------------------------------------------------
    {"store_name": "PMBJP Kendra, Sector 62", "address": "Sector 62, Noida, UP", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.3600, 28.6200]}},
    {"store_name": "Jan Aushadhi Store, Sector 18", "address": "Sector 18 Market, Noida, UP", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.3250, 28.5700]}},
    {"store_name": "PMBJP Kendra, Sector 15", "address": "Near Metro Station, Sector 15, Noida, UP", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.3150, 28.5850]}},
    {"store_name": "Jan Aushadhi Pharmacy, Sector 50", "address": "Central Market, Sector 50, Noida, UP", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.3650, 28.5750]}},
    {"store_name": "PMBJP Store, Sector 137", "address": "Advant Navis, Sector 137, Noida, UP", "state": "Uttar Pradesh", "location": {"type": "Point", "coordinates": [77.4000, 28.5050]}},

    # ---------------------------------------------------------
    # GURUGRAM & FARIDABAD
    # ---------------------------------------------------------
    {"store_name": "Jan Aushadhi Kendra, Sector 14", "address": "Sector 14 Market, Gurugram, Haryana", "state": "Haryana", "location": {"type": "Point", "coordinates": [77.0400, 28.4700]}},
    {"store_name": "PMBJP Store, MG Road", "address": "Near IFFCO Chowk, MG Road, Gurugram, Haryana", "state": "Haryana", "location": {"type": "Point", "coordinates": [77.0800, 28.4800]}},
    {"store_name": "Jan Aushadhi Pharmacy, Sector 56", "address": "HUDA Market, Sector 56, Gurugram, Haryana", "state": "Haryana", "location": {"type": "Point", "coordinates": [77.1000, 28.4200]}},
    {"store_name": "PMBJP Kendra, NIT", "address": "NIT Market, Faridabad, Haryana", "state": "Haryana", "location": {"type": "Point", "coordinates": [77.3000, 28.3800]}},
    {"store_name": "Jan Aushadhi Store, Sector 15", "address": "Sector 15 Market, Faridabad, Haryana", "state": "Haryana", "location": {"type": "Point", "coordinates": [77.3200, 28.4000]}}
]

def seed_map_data():
    print("Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    kendras_collection = db["Kendras"]

    print("Creating 2dsphere geospatial index...")
    kendras_collection.create_index([("location", GEOSPHERE)])

    print("Clearing old map entries...")
    kendras_collection.delete_many({})

    print(f"Injecting {len(DEMO_KENDRAS)} Jan Aushadhi Kendras...")
    result = kendras_collection.insert_many(DEMO_KENDRAS)
    
    print(f"Success! Inserted {len(result.inserted_ids)} locations across NCR.")
    client.close()

if __name__ == "__main__":
    seed_map_data()
