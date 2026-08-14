import itertools
from pydantic import BaseModel
from typing import List

class InteractionAlert(BaseModel):
    drug_a: str
    drug_b: str
    severity: str # "HIGH", "MODERATE", "LOW"
    description: str

# MVP Interaction Matrix (Mapped by canonical salt names)
# Format: { "salt_1": { "salt_2": ("SEVERITY", "Description") } }
DDI_MATRIX = {
    "clopidogrel": {
        "omeprazole": ("HIGH", "Omeprazole significantly reduces the antiplatelet effect of Clopidogrel, increasing thrombosis risk."),
        "esomeprazole": ("HIGH", "Esomeprazole reduces the efficacy of Clopidogrel.")
    },
    "warfarin": {
        "aspirin": ("HIGH", "Combining anticoagulants with NSAIDs/Aspirin drastically increases severe bleeding risk."),
        "ibuprofen": ("HIGH", "Increased risk of gastrointestinal bleeding.")
    },
    "ciprofloxacin": {
        "calciumcarbonate": ("MODERATE", "Antacids can decrease the absorption of Ciprofloxacin. Take at least 2 hours apart.")
    }
}

def check_batch_interactions(canonical_salts: List[str]) -> List[InteractionAlert]:
    """
    Takes a list of canonical salt keys from an entire invoice and checks every pair 
    against the DDI_MATRIX for known interactions.
    """
    alerts = []
    if not canonical_salts:
        return alerts

    # 1. Flatten and normalize all individual salts from the invoice
    all_salts = set()
    for salt_str in canonical_salts:
        if salt_str:
            # Canonical salts are separated by '|'
            for salt in salt_str.split('|'):
                clean_salt = salt.strip().lower()
                all_salts.add(clean_salt)
                # Add a version with no spaces since the matrix uses 'calciumcarbonate'
                all_salts.add(clean_salt.replace(" ", ""))

    # Remove empty strings if any
    all_salts.discard("")
    unique_salts = list(all_salts)

    # 2. Check all unique pairs using combinations
    for a, b in itertools.combinations(unique_salts, 2):
        # Check a -> b
        if a in DDI_MATRIX and b in DDI_MATRIX[a]:
            alerts.append(
                InteractionAlert(
                    drug_a=a,
                    drug_b=b,
                    severity=DDI_MATRIX[a][b][0],
                    description=DDI_MATRIX[a][b][1]
                )
            )
        # Check b -> a
        elif b in DDI_MATRIX and a in DDI_MATRIX[b]:
            alerts.append(
                InteractionAlert(
                    drug_a=b,
                    drug_b=a,
                    severity=DDI_MATRIX[b][a][0],
                    description=DDI_MATRIX[b][a][1]
                )
            )

    return alerts
