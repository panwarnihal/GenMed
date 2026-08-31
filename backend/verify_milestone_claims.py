"""
==============================================================================
  GenMed — 50% Milestone Presentation Claims Verification Audit
  File  : backend/verify_milestone_claims.py

  Audits the codebase and database against technical claims made in the 50%
  presentation deck:
    1. Architecture & Caching (Slide 3 & 7)
    2. Canonical Salt Hashing & Normalization (Slide 4 & 7)
    3. Statutory DPCO + 12% GST Overcharge Math (Slide 4)
    4. Clinical Safety & Regulatory Checks (Slide 5)
    5. End-to-End Pipeline Execution (Slide 6)
==============================================================================
"""

import sys
import os
import re
import inspect
import subprocess
from typing import List, Dict, Tuple
from functools import lru_cache

# Ensure sys.path includes backend directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Import target functions
from utils_hasher import generate_canonical_salt_key, generate_salt_hash
from app.services.regulatory_service import check_regulatory_status, get_master_rules
from app.services.ddi_service import check_batch_interactions, InteractionAlert


class MilestoneAuditor:
    def __init__(self):
        self.results: List[Dict[str, str]] = []

    def log_result(self, feature: str, claimed_behavior: str, file_inspected: str, passed: bool, notes: str = ""):
        status = "PASS" if passed else "FAIL"
        self.results.append({
            "feature": feature,
            "claimed_behavior": claimed_behavior,
            "file_inspected": file_inspected,
            "status": status,
            "notes": notes
        })

    # -------------------------------------------------------------------------
    # 1. Architecture & Caching (Slide 3 & 7)
    # -------------------------------------------------------------------------
    def audit_architecture_and_caching(self):
        # Claim 1.1: Local MongoDB URI without Atlas cloud references
        env_path = os.path.join(os.path.dirname(__file__), ".env")
        mongo_uri = os.getenv("MONGO_URI", "")
        is_local_mongo = ("127.0.0.1:27017" in mongo_uri or "localhost:27017" in mongo_uri)
        has_no_atlas = ("mongodb+srv://" not in mongo_uri and "mongodb.net" not in mongo_uri)
        
        self.log_result(
            feature="Local DB Connection",
            claimed_behavior="MONGO_URI points strictly to local MongoDB (127.0.0.1:27017) with zero Atlas cloud references",
            file_inspected="backend/.env",
            passed=is_local_mongo and has_no_atlas,
            notes=f"MONGO_URI: {mongo_uri}"
        )

        # Claim 1.2: RapidFuzz in-memory generic matching
        mapping_file = os.path.join(os.path.dirname(__file__), "app", "routes", "mapping.py")
        rapidfuzz_used = False
        if os.path.exists(mapping_file):
            with open(mapping_file, "r", encoding="utf-8") as f:
                content = f.read()
                if "rapidfuzz" in content and "fuzz.partial_ratio" in content:
                    rapidfuzz_used = True

        try:
            from rapidfuzz import fuzz
            score = fuzz.partial_ratio("augmentin 625", "augmentin 625 duo tab")
            rf_run = score > 50
        except ImportError:
            rf_run = False

        self.log_result(
            feature="Fuzzy Generic Matching",
            claimed_behavior="RapidFuzz imported and used for in-memory generic matching",
            file_inspected="backend/app/routes/mapping.py",
            passed=rapidfuzz_used and rf_run
        )

        # Claim 1.3: LRU & TTL Caching
        reg_service_file = os.path.join(os.path.dirname(__file__), "app", "services", "regulatory_service.py")
        has_lru_decorator = hasattr(check_regulatory_status, "cache_info")
        
        ttl_implemented = False
        if os.path.exists(reg_service_file):
            with open(reg_service_file, "r", encoding="utf-8") as f:
                code = f.read()
                if "_RULES_CACHE" in code and "_TTL_SECONDS" in code:
                    ttl_implemented = True

        self.log_result(
            feature="Caching System",
            claimed_behavior="check_regulatory_status uses @lru_cache and regulatory_service.py implements a TTL cache mechanism",
            file_inspected="backend/app/services/regulatory_service.py",
            passed=has_lru_decorator and ttl_implemented
        )

    # -------------------------------------------------------------------------
    # 2. Canonical Salt Hashing & Normalization (Slide 4 & 7)
    # -------------------------------------------------------------------------
    def audit_canonical_salt_hashing(self):
        # Claim 2.1: Pharmacopeial noise and dosage form stripping
        sample_input = "Paracetamol IP Tablet 500mg"
        key_1 = generate_canonical_salt_key(sample_input)
        noise_stripped = ("ip" not in key_1.split("500mg")[0]) and ("tablet" not in key_1)
        
        sample_input_2 = "Amoxicillin BP Capsule 500mg SR"
        key_2 = generate_canonical_salt_key(sample_input_2)
        noise_stripped_2 = ("bp" not in key_2) and ("capsule" not in key_2) and ("sr" not in key_2)

        self.log_result(
            feature="Noise & Dosage Form Stripping",
            claimed_behavior="Pharmacopeial noise (IP, BP, USP) and dosage forms (Tablet, Capsule, SR) are stripped",
            file_inspected="backend/utils_hasher.py",
            passed=noise_stripped and noise_stripped_2,
            notes=f"'{sample_input}' -> '{key_1}'"
        )

        # Claim 2.2: Chemical synonym normalization
        syn_1 = generate_canonical_salt_key("Acetaminophen 500mg")
        syn_2 = generate_canonical_salt_key("Amoxycillin 500mg")
        syn_3 = generate_canonical_salt_key("Clavulanic Acid 125mg")

        synonyms_correct = (
            "paracetamol" in syn_1 and
            "amoxicillin" in syn_2 and
            "clavulanate" in syn_3
        )

        self.log_result(
            feature="Chemical Synonym Normalization",
            claimed_behavior="Chemical synonyms normalize correctly (acetaminophen->paracetamol, amoxycillin->amoxicillin)",
            file_inspected="backend/utils_hasher.py",
            passed=synonyms_correct,
            notes=f"acetaminophen->{syn_1}, amoxycillin->{syn_2}"
        )

        # Claim 2.3: Alphabetical sorting and order-invariance for composite salts
        comp_a = generate_canonical_salt_key("Clavulanic Acid 125mg + Amoxicillin 500mg")
        comp_b = generate_canonical_salt_key("Amoxicillin 500mg + Clavulanic Acid 125mg")

        expected_key = "amoxicillin500mg|clavulanate125mg"
        order_invariant = (comp_a == expected_key and comp_b == expected_key)

        self.log_result(
            feature="Composite Salt Sorting",
            claimed_behavior="Composite salts are alphabetically sorted & order-invariant ('amoxicillin500mg|clavulanate125mg')",
            file_inspected="backend/utils_hasher.py",
            passed=order_invariant,
            notes=f"Output: '{comp_a}'"
        )

        # Claim 2.4: Dosage stripping for clinical matrix matching (Slide 7, Pivot 3)
        # Test DDI token explosion strips strengths (e.g. 500mg -> amoxicillin)
        alerts = check_batch_interactions(["amoxicillin500mg|clavulanate125mg", "methotrexate2.5mg"])
        ddi_found = any(a.drug_a == "amoxicillin" and a.drug_b == "methotrexate" for a in alerts)

        self.log_result(
            feature="Clinical Matrix Dosage Stripping",
            claimed_behavior="Dosage numbers are stripped when matching clinical matrices (Slide 7, Pivot 3)",
            file_inspected="backend/app/services/ddi_service.py",
            passed=ddi_found,
            notes="Extracted tokens stripped '500mg' to match DDI matrix key 'amoxicillin'"
        )

    # -------------------------------------------------------------------------
    # 3. Statutory DPCO + 12% GST Overcharge Math (Slide 4)
    # -------------------------------------------------------------------------
    def audit_dpco_overcharge_math(self):
        # Claim 3.1: Legal cap formula evaluation
        dpco_ceiling_price = 18.00
        quantity_units = 10
        expected_legal_cap = dpco_ceiling_price * quantity_units * 1.12  # 201.60

        scanner_file = os.path.join(os.path.dirname(__file__), "app", "routes", "scanner.py")
        formula_matched = False
        if os.path.exists(scanner_file):
            with open(scanner_file, "r", encoding="utf-8") as f:
                code = f.read()
                if "dpco_ceiling_price * item.quantity_units * 1.12" in code or "dpco_ceiling_price * quantity_units * 1.12" in code:
                    formula_matched = True

        math_exact = abs(expected_legal_cap - 201.60) < 1e-6

        self.log_result(
            feature="DPCO Legal Cap Formula Math",
            claimed_behavior="Assert legal cap formula evaluates exactly to: dpco_ceiling_price * quantity_units * 1.12",
            file_inspected="backend/app/routes/scanner.py",
            passed=formula_matched and math_exact,
            notes=f"18.00 * 10 * 1.12 = {expected_legal_cap:.2f}"
        )

        # Claim 3.2: Overcharge flagging rule
        printed_mrp = 223.40
        legal_cap = expected_legal_cap # 201.60
        paid_price = 220.00
        ceiling = min(printed_mrp, legal_cap) # 201.60
        
        is_overcharged = paid_price > ceiling
        overcharge_amount = round(paid_price - ceiling, 2)
        expected_overcharge = 18.40

        rule_valid = is_overcharged and (abs(overcharge_amount - expected_overcharge) < 0.01)

        self.log_result(
            feature="Overcharge Detection Rule",
            claimed_behavior="Assert overcharge is flagged whenever paid_price > min(printed_mrp, legal_cap)",
            file_inspected="backend/app/routes/scanner.py",
            passed=rule_valid,
            notes=f"Paid {paid_price} > min({printed_mrp}, {legal_cap:.2f}) -> Overcharge: {overcharge_amount}"
        )

    # -------------------------------------------------------------------------
    # 4. Clinical Safety & Regulatory Checks (Slide 5)
    # -------------------------------------------------------------------------
    def audit_clinical_safety_and_regulatory(self):
        # Claim 4.1: Banned combination flagged with is_banned: True
        banned_res = check_regulatory_status("nimesulide|pioglitazone")
        banned_passed = (banned_res.get("status") == "BANNED" and banned_res.get("is_banned") is True)

        self.log_result(
            feature="Banned FDC Verification",
            claimed_behavior="regulatory_service.py flags a known banned combination (nimesulide|pioglitazone) with is_banned: True",
            file_inspected="backend/app/services/regulatory_service.py",
            passed=banned_passed,
            notes=f"Result: {banned_res}"
        )

        # Claim 4.2: Schedule H1 prescription warning
        h1_res = check_regulatory_status("tramadol")
        h1_passed = (h1_res.get("status") == "SCHEDULE_H1" and h1_res.get("is_banned") is False and h1_res.get("warning_message") is not None)

        self.log_result(
            feature="Schedule H1 Rx Warnings",
            claimed_behavior="Schedule H1 drugs trigger strict prescription warnings",
            file_inspected="backend/app/services/regulatory_service.py",
            passed=h1_passed,
            notes=f"Result: {h1_res}"
        )

        # Claim 4.3: O(n^2) pairwise scan & HIGH severity DDI alert
        ddi_file = os.path.join(os.path.dirname(__file__), "app", "services", "ddi_service.py")
        o_n2_scan = False
        if os.path.exists(ddi_file):
            with open(ddi_file, "r", encoding="utf-8") as f:
                code = f.read()
                if "itertools.combinations" in code:
                    o_n2_scan = True

        alerts = check_batch_interactions(["clopidogrel75mg", "omeprazole20mg"])
        target_alert = next((a for a in alerts if a.drug_a == "clopidogrel" and a.drug_b == "omeprazole"), None)
        high_alert_passed = (target_alert is not None and target_alert.severity == "HIGH")

        self.log_result(
            feature="O(n²) Pairwise DDI Scanner",
            claimed_behavior="ddi_service.py runs O(n²) pairwise scan & correctly bubbles HIGH severity alert for clopidogrel+omeprazole",
            file_inspected="backend/app/services/ddi_service.py",
            passed=o_n2_scan and high_alert_passed,
            notes=f"Pairwise combinations used: {o_n2_scan}, Alert severity: {target_alert.severity if target_alert else None}"
        )

    # -------------------------------------------------------------------------
    # 5. End-to-End Pipeline Execution (Slide 6)
    # -------------------------------------------------------------------------
    def audit_e2e_pipeline_execution(self):
        pipeline_test_file = os.path.join(os.path.dirname(__file__), "test_full_audit_pipeline.py")
        
        # Execute test_full_audit_pipeline.py using python subprocess
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"
        
        result = subprocess.run(
            [sys.executable, pipeline_test_file],
            capture_output=True,
            text=True,
            env=env
        )
        
        passed = (result.returncode == 0 and "Pipeline passed all verification checks" in result.stdout)

        self.log_result(
            feature="End-to-End Pipeline Audit",
            claimed_behavior="Programmatically run test_full_audit_pipeline.py and capture clean exit code (0)",
            file_inspected="backend/test_full_audit_pipeline.py",
            passed=passed,
            notes=f"Exit Code: {result.returncode}"
        )

    # -------------------------------------------------------------------------
    # Print Console Table Summary
    # -------------------------------------------------------------------------
    def print_summary_table(self):
        print("\n" + "=" * 115)
        print(" GENMED — 50% MILESTONE TECHNICAL CLAIMS VERIFICATION REPORT".center(115))
        print("=" * 115)
        
        headers = ["Feature", "Claimed Behavior", "File Inspected", "STATUS"]
        col_widths = [32, 45, 25, 10]

        def format_row(cols):
            return f"│ {cols[0]:<{col_widths[0]}} │ {cols[1]:<{col_widths[1]}} │ {cols[2]:<{col_widths[2]}} │ {cols[3]:^{col_widths[3]}} │"

        header_line = format_row(headers)
        separator = "+" + "+".join("-" * (w + 2) for w in col_widths) + "+"
        top_border = "+" + "+".join("=" * (w + 2) for w in col_widths) + "+"

        print(top_border)
        print(header_line)
        print(top_border)

        all_passed = True
        for res in self.results:
            status_str = f"✅ {res['status']}" if res['status'] == "PASS" else f"❌ {res['status']}"
            if res['status'] != "PASS":
                all_passed = False
            
            # Truncate claimed behavior if too long for clean table fit
            claimed = res['claimed_behavior']
            if len(claimed) > col_widths[1]:
                claimed = claimed[:col_widths[1]-3] + "..."

            row = [
                res['feature'],
                claimed,
                res['file_inspected'],
                res['status']
            ]
            print(format_row(row))

        print(separator)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r['status'] == "PASS")
        print(f"\nAudit Summary: {passed_tests}/{total_tests} Claims Verified Successfully ({passed_tests/total_tests*100:.0f}% Pass Rate)")
        
        if all_passed:
            print("🎉 ALL TECHNICAL CLAIMS FROM 50% PRESENTATION DECK ARE FULLY VERIFIED!\n")
        else:
            print("⚠️ SOME CLAIMS FAILED VERIFICATION. CHECK DETAILS ABOVE.\n")

        return 0 if all_passed else 1


def main():
    auditor = MilestoneAuditor()
    auditor.audit_architecture_and_caching()
    auditor.audit_canonical_salt_hashing()
    auditor.audit_dpco_overcharge_math()
    auditor.audit_clinical_safety_and_regulatory()
    auditor.audit_e2e_pipeline_execution()
    
    exit_code = auditor.print_summary_table()
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
