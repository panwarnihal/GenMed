import os
import re
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
# TTL Caching for NSQ Blacklisted Batches
# -------------------------------------------------------------------------
_NSQ_CACHE = {
    "batches": [],
    "last_fetched": 0
}
_NSQ_TTL_SECONDS = 3600  # 1 hour

def get_nsq_batches():
    """
    Fetches NSQ blacklisted batch records from the Blacklisted_Batches collection.
    Uses the updated schema keys: medicine_name, batch_number, manufacturer, failure_reason.
    Cached in-memory for 1 hour.
    """
    current_time = time.time()
    if current_time - _NSQ_CACHE["last_fetched"] > _NSQ_TTL_SECONDS:
        db = get_db()
        collection = db["Blacklisted_Batches"]

        batches = list(collection.find(
            {},
            {"_id": 0, "medicine_name": 1, "batch_number": 1,
             "manufacturer": 1, "failure_reason": 1}
        ))
        _NSQ_CACHE["batches"] = batches
        _NSQ_CACHE["last_fetched"] = current_time

    return _NSQ_CACHE["batches"]


def _normalize_for_matching(text: str) -> str:
    """Lowercase, strip noise words and non-alpha chars for substring comparison."""
    if not text:
        return ""
    text = text.lower()
    # Strip common pharmacopeial / dosage form noise
    text = re.sub(
        r'\b(tablets?|capsules?|injection|syrup|suspension|ip|bp|usp|sr|er|mg|ml|gm)\b',
        '', text,
    )
    return re.sub(r'[^a-z0-9]', '', text)


# -------------------------------------------------------------------------
# LRU Cached Regulatory Status Check
# -------------------------------------------------------------------------
@lru_cache(maxsize=1024)
def check_regulatory_status(canonical_salt_key: str, medicine_name: str = None, batch_number: str = None) -> list:
    """
    Evaluates the canonical salt key against CDSCO regulations and the NSQ
    blacklisted batches collection.

    Checks (in priority order):
      1. Banned FDCs        — appends status='BANNED', is_banned=True
      2. Schedule H1 Drugs  — appends status='SCHEDULE_H1', is_banned=False
      3. NSQ Blacklisted    — appends status='NSQ_FLAGGED', is_banned=False
      4. Default            — returns status='APPROVED'

    Returns a list of dicts with 'status', 'is_banned', and 'warning_message'.
    Utilizes an LRU cache so identical line items skip rule iteration.
    """
    warnings = []

    if not canonical_salt_key:
        return [{
            "status": "APPROVED",
            "is_banned": False,
            "warning_message": None
        }]

    banned_fdcs, schedule_h1_drugs = get_master_rules()

    # 1. Check for Banned FDCs
    for banned_rule in banned_fdcs:
        banned_salt = banned_rule.get("canonical_salt_key")
        if banned_salt and banned_salt in canonical_salt_key:
            warnings.append({
                "status": "BANNED",
                "is_banned": True,
                "warning_message": banned_rule.get("message", f"Contains Banned FDC ({banned_salt}). DO NOT CONSUME.")
            })

    # 2. Check for Schedule H1 (Narcotics/Strict Antibiotics)
    salts = canonical_salt_key.split("|")
    for salt in salts:
        for h1_rule in schedule_h1_drugs:
            h1_drug = h1_rule.get("drug_name")
            if h1_drug and salt == h1_drug:
                warnings.append({
                    "status": "SCHEDULE_H1",
                    "is_banned": False,
                    "warning_message": h1_rule.get("message", f"Contains Schedule H1 Drug ({salt}). Valid prescription required.")
                })

    # 3. Check NSQ Blacklisted Batches
    nsq_batches = get_nsq_batches()
    nsq_found = False

    if batch_number:
        # Exact match check
        for batch in nsq_batches:
            if batch.get("batch_number") == batch_number:
                failure_reason = batch.get("failure_reason", "")
                manufacturer = batch.get("manufacturer", "Unknown")
                warnings.append({
                    "status": "NSQ_FLAGGED",
                    "is_banned": False,
                    "warning_message": (
                        f"CDSCO NSQ Alert: {medicine_name or 'Unknown'} "
                        f"(Batch: {batch_number}, Mfr: {manufacturer}) "
                        f"failed quality test — {failure_reason}."
                        if failure_reason
                        else f"CDSCO NSQ Alert: {medicine_name or 'Unknown'} "
                             f"(Batch: {batch_number}) flagged as Not of Standard Quality."
                    )
                })
                nsq_found = True
                break

    if not nsq_found and medicine_name:
        # Regex search on medicine_name
        try:
            pattern = re.compile(re.escape(medicine_name), re.IGNORECASE)
            for batch in nsq_batches:
                if pattern.search(batch.get("medicine_name", "")):
                    failure_reason = batch.get("failure_reason", "")
                    manufacturer = batch.get("manufacturer", "Unknown")
                    warnings.append({
                        "status": "NSQ_FLAGGED",
                        "is_banned": False,
                        "warning_message": f"Active NSQ quality recall found for this drug (Reason: {failure_reason}, Manufacturer: {manufacturer}). Verify your batch."
                    })
                    break
        except Exception:
            pass

    # 4. Default to "Approved" if no warnings
    if not warnings:
        warnings.append({
            "status": "APPROVED",
            "is_banned": False,
            "warning_message": None
        })

    return warnings
