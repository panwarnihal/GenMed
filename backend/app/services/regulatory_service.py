import os
import time
from functools import lru_cache
from pymongo import MongoClient
from dotenv import load_dotenv

# Initialize Database Connection
load_dotenv()
mongo_uri = os.getenv("MONGO_URI")
db_name = os.getenv("DB_NAME", "genmed_db")

_client = None
_db = None

def get_db():
    global _client, _db
    if _db is None:
        if not mongo_uri:
            # Provide a fallback or raise exception if not configured
            pass
        _client = MongoClient(mongo_uri)
        _db = _client[db_name]
    return _db

# -------------------------------------------------------------------------
# TTL Caching for Master Ruleset
# -------------------------------------------------------------------------
_RULES_CACHE = {
    "banned_fdcs": [],
    "schedule_h1_drugs": [],
    "last_fetched": 0
}
_TTL_SECONDS = 3600  # 1 hour

def get_master_rules():
    """
    Fetches CDSCO master rules from MongoDB, caching them in-memory for 1 hour
    to avoid hitting the database on every substring check.
    """
    current_time = time.time()
    if current_time - _RULES_CACHE["last_fetched"] > _TTL_SECONDS:
        db = get_db()
        collection = db["cdsco_regulations"]
        
        # Fetch BANNED_FDCs
        banned = list(collection.find({"rule_type": "BANNED_FDC"}, {"_id": 0}))
        _RULES_CACHE["banned_fdcs"] = banned
        
        # Fetch SCHEDULE_H1
        h1 = list(collection.find({"rule_type": "SCHEDULE_H1"}, {"_id": 0}))
        _RULES_CACHE["schedule_h1_drugs"] = h1
        
        _RULES_CACHE["last_fetched"] = current_time
        
    return _RULES_CACHE["banned_fdcs"], _RULES_CACHE["schedule_h1_drugs"]


# -------------------------------------------------------------------------
# LRU Cached Regulatory Status Check
# -------------------------------------------------------------------------
@lru_cache(maxsize=1024)
def check_regulatory_status(canonical_salt_key: str) -> dict:
    """
    Evaluates the canonical salt key against CDSCO regulations.
    Returns a dict with 'status', 'is_banned', and 'warning_message'.
    Utilizes an LRU cache so identical line items skip rule iteration.
    """
    if not canonical_salt_key:
        return {
            "status": "APPROVED",
            "is_banned": False,
            "warning_message": None
        }

    banned_fdcs, schedule_h1_drugs = get_master_rules()

    # 1. Check for Banned FDCs
    for banned_rule in banned_fdcs:
        banned_salt = banned_rule.get("canonical_salt_key")
        if banned_salt and banned_salt in canonical_salt_key:
            return {
                "status": "BANNED",
                "is_banned": True,
                "warning_message": banned_rule.get("message", f"Contains Banned FDC ({banned_salt}). DO NOT CONSUME.")
            }

    # 2. Check for Schedule H1 (Narcotics/Strict Antibiotics)
    salts = canonical_salt_key.split("|")
    for salt in salts:
        for h1_rule in schedule_h1_drugs:
            h1_drug = h1_rule.get("drug_name")
            if h1_drug and salt == h1_drug:
                return {
                    "status": "SCHEDULE_H1",
                    "is_banned": False,
                    "warning_message": h1_rule.get("message", f"Contains Schedule H1 Drug ({salt}). Valid prescription required.")
                }

    # 3. Default to "Approved"
    return {
        "status": "APPROVED",
        "is_banned": False,
        "warning_message": None
    }
