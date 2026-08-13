# Hardcoded MVP lists for Indian CDSCO Regulations
BANNED_FDCS = [
    "nimesulide|pioglitazone", 
    "chlorpheniramine|paracetamol|phenylephrine",  # sorted alphabetically
    "amoxicillin|dicloxacillin",
    "cetirizine|nimesulide",
    "paracetamol|tapentadol"
]

SCHEDULE_H1_DRUGS = [
    "moxifloxacin", "cefixime", "tramadol", "alprazolam", "ketamine", "buprenorphine"
]

def check_regulatory_status(canonical_salt_key: str) -> dict:
    """
    Evaluates the canonical salt key against CDSCO regulations.
    Returns a dict with 'status', 'is_banned', and 'warning_message'.
    """
    if not canonical_salt_key:
        return {
            "status": "APPROVED",
            "is_banned": False,
            "warning_message": None
        }

    # 1. Check for Banned FDCs
    for banned_fdc in BANNED_FDCS:
        if banned_fdc in canonical_salt_key:
            return {
                "status": "BANNED",
                "is_banned": True,
                "warning_message": f"Contains Banned FDC ({banned_fdc}). DO NOT CONSUME."
            }

    # 2. Check for Schedule H1 (Narcotics/Strict Antibiotics)
    salts = canonical_salt_key.split("|")
    for salt in salts:
        if salt in SCHEDULE_H1_DRUGS:
            return {
                "status": "SCHEDULE_H1",
                "is_banned": False,
                "warning_message": f"Contains Schedule H1 Drug ({salt}). Valid prescription required."
            }

    # 3. Default to "Approved"
    return {
        "status": "APPROVED",
        "is_banned": False,
        "warning_message": None
    }
