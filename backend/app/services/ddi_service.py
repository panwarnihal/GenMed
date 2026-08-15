"""
==============================================================================
  GenMed — Drug-Drug Interaction (DDI) Checker Service
  File  : app/services/ddi_service.py

  Responsibility:
    Given the full list of canonical salt keys extracted from an invoice,
    exhaustively check every pairwise combination against a known interaction
    matrix and return structured InteractionAlert objects, ordered by clinical
    severity (HIGH → MODERATE → LOW).

  Architecture:
    - Pure in-memory MVP (no external API calls, zero latency overhead).
    - The matrix is bidirectional: only one direction needs to be declared;
      the engine checks both (a→b) and (b→a) at runtime.
    - Severity constants are ranked for deterministic sort ordering.
    - Salt normalization mirrors utils_hasher.generate_canonical_salt_key:
        • lowercase + strip
        • split on '|' (canonical key separator used by the hasher)
        • collapse internal whitespace
      This ensures keys produced by the scanner pipeline match matrix keys.

  Extending the matrix:
    Add a new entry to DDI_MATRIX following the format:
        "salt_a": { "salt_b": ("SEVERITY", "Clinical rationale...") }
    Keys are lowercased, space-free canonical names (same as canonical_salt_key).
==============================================================================
"""

import itertools
import logging
from typing import List

from pydantic import BaseModel

logger = logging.getLogger("genmed.ddi")

# ─────────────────────────────────────────────────────────────────────────────
# SEVERITY CONSTANTS & ORDERING
# ─────────────────────────────────────────────────────────────────────────────

# Lower number = higher clinical priority (used for sorting alerts)
_SEVERITY_RANK: dict[str, int] = {
    "HIGH":     1,
    "MODERATE": 2,
    "LOW":      3,
}

VALID_SEVERITIES = frozenset(_SEVERITY_RANK.keys())


# ─────────────────────────────────────────────────────────────────────────────
# PYDANTIC SCHEMA
# ─────────────────────────────────────────────────────────────────────────────

class InteractionAlert(BaseModel):
    """A single pairwise Drug-Drug Interaction flagged for a patient invoice."""

    drug_a: str
    """First drug (canonical salt key, lowercase)."""

    drug_b: str
    """Second drug (canonical salt key, lowercase)."""

    severity: str
    """Clinical severity tier: 'HIGH', 'MODERATE', or 'LOW'."""

    description: str
    """Human-readable clinical rationale for the interaction."""


# ─────────────────────────────────────────────────────────────────────────────
# MVP INTERACTION MATRIX
# ─────────────────────────────────────────────────────────────────────────────
# Format:  { "salt_a": { "salt_b": ("SEVERITY", "Description") } }
#
# Keys must be lowercase, space-free canonical salt names, consistent with
# generate_canonical_salt_key() output (utils_hasher.py).
#
# The matrix is INTENTIONALLY one-directional; the engine resolves both
# directions at runtime — do NOT add redundant reverse entries.
# ─────────────────────────────────────────────────────────────────────────────

DDI_MATRIX: dict[str, dict[str, tuple[str, str]]] = {

    # ── Antiplatelet interactions ────────────────────────────────────────────
    "clopidogrel": {
        "omeprazole": (
            "HIGH",
            "Omeprazole is a potent CYP2C19 inhibitor and significantly reduces "
            "the conversion of Clopidogrel to its active metabolite, increasing "
            "the risk of cardiovascular thrombotic events."
        ),
        "esomeprazole": (
            "HIGH",
            "Esomeprazole (S-isomer of omeprazole) inhibits CYP2C19 and reduces "
            "Clopidogrel efficacy. Alternative PPI (e.g., pantoprazole) is preferred."
        ),
        "aspirin": (
            "MODERATE",
            "Combined antiplatelet therapy increases bleeding risk. Dual therapy "
            "is clinically indicated post-ACS but requires close monitoring."
        ),
    },

    # ── Anticoagulant interactions ───────────────────────────────────────────
    "warfarin": {
        "aspirin": (
            "HIGH",
            "Combining Warfarin with Aspirin dramatically increases the risk of "
            "major and fatal bleeding. Monitor INR closely; avoid unless clinically mandated."
        ),
        "ibuprofen": (
            "HIGH",
            "NSAIDs inhibit platelet function and can cause GI mucosal damage, "
            "leading to severe or fatal gastrointestinal bleeding when combined with Warfarin."
        ),
        "naproxen": (
            "HIGH",
            "Naproxen (NSAID) potentiates Warfarin's anticoagulant effect and "
            "independently increases GI bleeding risk. Avoid co-administration."
        ),
        "metronidazole": (
            "HIGH",
            "Metronidazole inhibits CYP2C9, the primary enzyme metabolising "
            "Warfarin (S-enantiomer), causing a significant rise in INR and bleeding risk."
        ),
        "fluconazole": (
            "HIGH",
            "Fluconazole strongly inhibits CYP2C9/CYP3A4, markedly potentiating "
            "Warfarin's anticoagulant effect. INR monitoring is essential."
        ),
        "amiodarone": (
            "HIGH",
            "Amiodarone and its metabolite inhibit CYP2C9 and CYP3A4, dramatically "
            "increasing Warfarin exposure. INR can double or triple within days."
        ),
    },

    # ── Antibiotic interactions ──────────────────────────────────────────────
    "ciprofloxacin": {
        "calciumcarbonate": (
            "MODERATE",
            "Calcium-containing antacids chelate Ciprofloxacin in the GI tract, "
            "reducing oral bioavailability by up to 50%. Administer Ciprofloxacin "
            "at least 2 hours before or 6 hours after antacids."
        ),
        "theophylline": (
            "HIGH",
            "Ciprofloxacin inhibits CYP1A2, significantly increasing Theophylline "
            "plasma levels. Toxicity (seizures, arrhythmias) may occur. Reduce "
            "Theophylline dose and monitor levels."
        ),
        "tizanidine": (
            "HIGH",
            "Ciprofloxacin markedly inhibits CYP1A2-mediated Tizanidine metabolism, "
            "causing up to a 10-fold increase in Tizanidine AUC, risking severe "
            "hypotension and sedation. Combination is contraindicated."
        ),
    },

    "amoxicillin": {
        "methotrexate": (
            "HIGH",
            "Amoxicillin competes with Methotrexate for renal tubular secretion, "
            "reducing its clearance and raising plasma levels to potentially "
            "toxic concentrations. Monitor CBC and renal function."
        ),
    },

    "clarithromycin": {
        "atorvastatin": (
            "HIGH",
            "Clarithromycin is a potent CYP3A4 inhibitor; co-administration "
            "increases Atorvastatin AUC by up to 8-fold, markedly raising the "
            "risk of myopathy and rhabdomyolysis. Suspend statin during therapy."
        ),
        "simvastatin": (
            "HIGH",
            "Clarithromycin inhibits CYP3A4, causing dangerous accumulation of "
            "Simvastatin. The combination is contraindicated due to rhabdomyolysis risk."
        ),
        "carbamazepine": (
            "HIGH",
            "Clarithromycin inhibits CYP3A4-mediated Carbamazepine metabolism, "
            "leading to Carbamazepine toxicity (diplopia, ataxia, neurotoxicity)."
        ),
    },

    # ── Statins ──────────────────────────────────────────────────────────────
    "atorvastatin": {
        "gemfibrozil": (
            "HIGH",
            "Gemfibrozil inhibits OATP1B1 and CYP2C8, dramatically increasing "
            "statin exposure. The combination of statins and gemfibrozil significantly "
            "increases the risk of myopathy and rhabdomyolysis."
        ),
    },

    # ── Cardiac drugs ────────────────────────────────────────────────────────
    "digoxin": {
        "amiodarone": (
            "HIGH",
            "Amiodarone inhibits P-glycoprotein and renal clearance of Digoxin, "
            "causing Digoxin toxicity (bradycardia, heart block, arrhythmias). "
            "Reduce Digoxin dose by 50% and monitor levels."
        ),
        "clarithromycin": (
            "HIGH",
            "Clarithromycin inhibits P-glycoprotein and CYP3A4, increasing "
            "Digoxin plasma concentrations and the risk of toxicity."
        ),
        "spironolactone": (
            "MODERATE",
            "Spironolactone can increase Digoxin serum levels by reducing renal "
            "tubular secretion. Monitor for Digoxin toxicity signs."
        ),
    },

    # ── ACE Inhibitor / ARB interactions ─────────────────────────────────────
    "lisinopril": {
        "potassiumchloride": (
            "MODERATE",
            "ACE inhibitors reduce aldosterone, impairing potassium excretion. "
            "Combined with potassium supplements, hyperkalaemia risk is significant. "
            "Monitor serum potassium."
        ),
        "spironolactone": (
            "MODERATE",
            "Both agents increase serum potassium. Combination in heart failure "
            "is sometimes used but requires careful electrolyte monitoring to "
            "prevent life-threatening hyperkalaemia."
        ),
    },

    # ── Diabetes medications ─────────────────────────────────────────────────
    "metformin": {
        "iodinecontrastdye": (
            "HIGH",
            "IV iodine contrast can acutely impair renal function, causing "
            "Metformin accumulation and life-threatening lactic acidosis. "
            "Withhold Metformin 48h before and after contrast procedures."
        ),
        "alcohol": (
            "MODERATE",
            "Alcohol potentiates the lactic acidosis risk associated with "
            "Metformin, particularly in patients with hepatic dysfunction."
        ),
    },

    # ── Antidepressants ──────────────────────────────────────────────────────
    "fluoxetine": {
        "tramadol": (
            "HIGH",
            "Combining SSRIs (Fluoxetine) with Tramadol increases the risk of "
            "serotonin syndrome (hyperthermia, rigidity, clonus) and lowers the "
            "seizure threshold. Combination should be avoided."
        ),
        "maois": (
            "HIGH",
            "Combining Fluoxetine with MAO inhibitors can cause severe, potentially "
            "fatal serotonin syndrome. A washout of ≥14 days is required between agents."
        ),
    },

    # ── Seizure medications ──────────────────────────────────────────────────
    "phenytoin": {
        "fluconazole": (
            "HIGH",
            "Fluconazole inhibits CYP2C9, elevating Phenytoin plasma levels "
            "significantly and increasing risk of toxicity (nystagmus, ataxia)."
        ),
        "carbamazepine": (
            "MODERATE",
            "Carbamazepine induces CYP enzymes, reducing Phenytoin efficacy. "
            "Phenytoin can also alter Carbamazepine levels unpredictably. "
            "Monitor drug levels closely."
        ),
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# NORMALIZATION HELPER
# ─────────────────────────────────────────────────────────────────────────────

def _normalize_salt_token(token: str) -> str:
    """
    Converts a raw salt string to a canonical, space-free lowercase key
    suitable for DDI_MATRIX lookup.

    Steps mirror the canonical key used by utils_hasher.generate_canonical_salt_key:
      1. Strip whitespace
      2. Lowercase
      3. Remove all internal spaces (matrix keys have no spaces)
    """
    return token.strip().lower().replace(" ", "")


def _explode_salts(canonical_salts: List[str]) -> set[str]:
    """
    Accepts the list of canonical_salt_key strings produced by the scanner
    pipeline (each entry may be a '|'-delimited composite, e.g. 'amoxicillin|clavulanate')
    and returns a flat set of individual, normalized salt tokens ready for
    pairwise DDI lookup.
    """
    tokens: set[str] = set()
    for entry in canonical_salts:
        if not entry:
            continue
        # canonical_salt_key uses '|' as the separator between salts
        for part in entry.split("|"):
            normalized = _normalize_salt_token(part)
            if normalized:
                tokens.add(normalized)
    return tokens


# ─────────────────────────────────────────────────────────────────────────────
# CORE ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def check_batch_interactions(canonical_salts: List[str]) -> List[InteractionAlert]:
    """
    Analyzes an entire invoice's worth of canonical salt keys for pairwise
    Drug-Drug Interactions (DDIs) based on the in-memory DDI_MATRIX.

    Args:
        canonical_salts:
            A list of canonical salt key strings produced by
            ``utils_hasher.generate_canonical_salt_key()``. Each element may
            be a '|'-delimited composite for multi-ingredient drugs (e.g.
            ``'amoxicillin|clavulanate'``).

    Returns:
        A list of :class:`InteractionAlert` objects representing every detected
        interaction, sorted by clinical severity (HIGH → MODERATE → LOW) and
        then alphabetically by drug pair for deterministic output.

    Examples::

        alerts = check_batch_interactions([
            "clopidogrel",
            "omeprazole",
            "atorvastatin|calciumcarbonate",
        ])
        # → [ InteractionAlert(drug_a='clopidogrel', drug_b='omeprazole',
        #                       severity='HIGH', description='...') ]
    """
    if not canonical_salts:
        logger.debug("DDI check called with empty salt list — returning no alerts.")
        return []

    # 1. Flatten all line-items into individual canonical salt tokens
    unique_salts = _explode_salts(canonical_salts)

    if len(unique_salts) < 2:
        logger.debug(
            "DDI check: fewer than 2 unique salts found (%s) — no pairs to evaluate.",
            unique_salts,
        )
        return []

    logger.info(
        "DDI engine evaluating %d unique salts: %s",
        len(unique_salts),
        sorted(unique_salts),
    )

    # 2. Check all unique pairs — O(n²) which is perfectly acceptable
    #    for invoice sizes (typically ≤ 30 line items)
    alerts: List[InteractionAlert] = []
    seen_pairs: set[frozenset] = set()   # deduplication guard

    for a, b in itertools.combinations(sorted(unique_salts), 2):
        pair_key = frozenset({a, b})
        if pair_key in seen_pairs:
            continue  # should not happen with combinations(), but defensive

        interaction: tuple[str, str] | None = None
        drug_a_display, drug_b_display = a, b

        # Check a → b direction first, then b → a
        if a in DDI_MATRIX and b in DDI_MATRIX[a]:
            interaction = DDI_MATRIX[a][b]
            drug_a_display, drug_b_display = a, b
        elif b in DDI_MATRIX and a in DDI_MATRIX[b]:
            interaction = DDI_MATRIX[b][a]
            drug_a_display, drug_b_display = b, a

        if interaction is not None:
            severity, description = interaction
            # Gracefully handle any unexpected severity values in future extensions
            if severity not in VALID_SEVERITIES:
                logger.warning(
                    "Unknown severity '%s' for pair (%s, %s) — defaulting to MODERATE.",
                    severity, a, b,
                )
                severity = "MODERATE"

            alerts.append(
                InteractionAlert(
                    drug_a=drug_a_display,
                    drug_b=drug_b_display,
                    severity=severity,
                    description=description,
                )
            )
            seen_pairs.add(pair_key)
            logger.info(
                "DDI ALERT [%s]: %s ↔ %s", severity, drug_a_display, drug_b_display
            )

    # 3. Sort: HIGH first, then MODERATE, then LOW; within tier sort alphabetically
    alerts.sort(
        key=lambda alert: (
            _SEVERITY_RANK.get(alert.severity, 99),
            alert.drug_a,
            alert.drug_b,
        )
    )

    logger.info(
        "DDI check complete — %d interaction(s) detected out of %d unique salts.",
        len(alerts),
        len(unique_salts),
    )
    return alerts


# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY HELPER  (for embedding into FinalAuditReport)
# ─────────────────────────────────────────────────────────────────────────────

def build_ddi_summary(alerts: List[InteractionAlert]) -> dict:
    """
    Converts a list of InteractionAlert objects into a serialisable summary
    dict ready to be embedded into the scanner's FinalAuditReport payload.

    Returns::

        {
            "interaction_count": int,
            "has_critical_interactions": bool,   # True if any severity == "HIGH"
            "severity_breakdown": {
                "HIGH": int, "MODERATE": int, "LOW": int
            },
            "alerts": [ {drug_a, drug_b, severity, description}, ... ]
        }
    """
    breakdown = {"HIGH": 0, "MODERATE": 0, "LOW": 0}
    for alert in alerts:
        if alert.severity in breakdown:
            breakdown[alert.severity] += 1

    return {
        "interaction_count": len(alerts),
        "has_critical_interactions": breakdown["HIGH"] > 0,
        "severity_breakdown": breakdown,
        "alerts": [alert.model_dump() for alert in alerts],
    }
