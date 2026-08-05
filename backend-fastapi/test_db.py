import os
from dotenv import load_dotenv
from pymongo import MongoClient

# 1. Load variables from .env
load_dotenv()
mongo_uri = os.getenv("MONGO_URI")

try:
    # 2. Attempt connection with a 5-second timeout
    print("⏳ Connecting to MongoDB Atlas...")
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    
    # 3. Send a ping command to verify the server is responsive
    client.admin.command('ping')
    
    print("✅ SUCCESS: Connected to MongoDB Atlas cluster!")
    print(f"✅ Available databases: {client.list_database_names()}")

except Exception as e:
    print("\n❌ CONNECTION FAILED!")
    print(f"Error details: {e}")