import hashlib
import json
import re
from typing import List, Dict

def generate_salt_hash(active_ingredients: List[Dict[str, str]]) -> str:
    """
    Takes a list of active ingredients, normalizes them alphabetically,
    and returns a deterministic SHA-256 cryptographic hash string.
    
    Example Input:
        [
            {"salt": "Clavulanic Acid", "strength": "125mg"},
            {"salt": "Amoxicillin", "strength": "500mg"}
        ]
    """
    if not active_ingredients:
        raise ValueError("Active ingredients list cannot be empty.")

    # 1. Clean, lowercase, and remove trailing spaces from salt & strength
    normalized_list = []
    for item in active_ingredients:
        clean_salt = item.get("salt", "").strip().lower()
        clean_strength = item.get("strength", "").strip().lower()
        normalized_list.append(f"{clean_salt}_{clean_strength}")

    # 2. Sort alphabetically so ingredient order never changes the hash
    normalized_list.sort()

    # 3. Create a canonical string (e.g., "amoxicillin_500mg|clavulanate_acid_125mg")
    canonical_string = "|".join(normalized_list)

    # 4. Generate SHA-256 hash
    salt_hash = hashlib.sha256(canonical_string.encode('utf-8')).hexdigest()
    
    return salt_hash, canonical_string


def generate_canonical_salt_key(text: str) -> str:
    """
    Normalizes drug composition text into a standardized canonical key:
    - Lowercase & strip pharmacopeial tags (IP/BP/USP)
    - Normalize common salt spelling synonyms (amoxycillin -> amoxicillin, clavulanic acid -> clavulanate)
    - Standardize dosage units (500 mg -> 500mg)
    - Alphabetically sort components
    """
    if not text or not isinstance(text, str):
        return ""

    text = text.lower()
    
    # Strip pharmacopeial & dosage form noise
    noise_patterns = [
        r'\bip\b', r'\bbp\b', r'\busp\b', r'\btrihydrate\b', r'\bhydrochloride\b',
        r'\bmaleate\b', r'\bsodium\b', r'\bpotassium\b', r'\btablet\b', r'\btablets\b',
        r'\bcapsule\b', r'\bcapsules\b', r'\bdispersible\b', r'\bsr\b', r'\ber\b',
        r'\bacid\b'
    ]
    for pattern in noise_patterns:
        text = re.sub(pattern, '', text)

    # Normalize salt spelling synonyms (Indian Pharmacopeia variations)
    text = re.sub(r'\bamoxycillin\b', 'amoxicillin', text)
    text = re.sub(r'\bclavulanic\b', 'clavulanate', text)
    text = re.sub(r'\bacetaminophen\b', 'paracetamol', text)

    # Standardize unit spacing
    text = re.sub(r'(\d+)\s*(mg|gm|g|ml|mcg|iu)', r'\1\2', text)

    # Tokenize multi-salt compositions separated by '+' or 'and'
    components = re.split(r'\s*\+\s*|\s+and\s+', text)
    clean_tokens = [re.sub(r'[^a-z0-9]', '', c) for c in components if c.strip()]
    clean_tokens.sort()

    return "|".join(clean_tokens)


# --- QUICK LOCAL TEST (Run this file directly via `python utils_hasher.py`) ---
if __name__ == "__main__":
    # Test Brand (Order A)
    brand_salts = [
        {"salt": "Clavulanic Acid", "strength": "125mg"},
        {"salt": "Amoxicillin", "strength": "500mg"}
    ]
    
    # Test Generic (Order B - Reversed)
    generic_salts = [
        {"salt": "Amoxicillin ", "strength": " 500mg "},
        {"salt": "clavulanic acid", "strength": "125mg"}
    ]

    brand_hash, brand_str = generate_salt_hash(brand_salts)
    generic_hash, generic_str = generate_salt_hash(generic_salts)

    print(f"Brand String:   {brand_str}")
    print(f"Generic String: {generic_str}")
    print(f"Brand Hash:     {brand_hash}")
    print(f"Generic Hash:   {generic_hash}")
    print("-" * 40)
    print(f"MATCH SUCCESSFUL? {brand_hash == generic_hash}")