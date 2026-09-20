import os
import json
import asyncio
from pymongo import MongoClient
from dotenv import load_dotenv

# Set environment before imports that use it
os.environ["MONGO_URI"] = "mongodb://127.0.0.1:27017/"
os.environ["DB_NAME"] = "genmed_db"

from app.routes.scanner import upload_invoice_image, ExtractedLineItem, InvoiceScanResult, _call_gemini_vision
from fastapi import UploadFile
from unittest.mock import patch, MagicMock

# 1. Connect to local MongoDB & Seed Mock Records
client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["genmed_db"]

# Clear test data first
db["Generic_Inventory"].delete_many({"drug_code": {"$regex": "^TEST_"}})
db["cdsco_regulations"].delete_many({"rule_type": "TEST_BANNED_FDC"})

print("Seeding test records...")
# Seed generic alternatives
db["Generic_Inventory"].insert_many([
    {
        "drug_code": "TEST_001",
        "generic_name": "amoxicillin 500mg + clavulanic acid 125mg",
        "canonical_salt_key": "amoxicillin|clavulanate",
        "unit_size": "10'S",
        "jan_aushadhi_price": 50.0
    },
    {
        "drug_code": "TEST_002",
        "generic_name": "clopidogrel 75mg",
        "canonical_salt_key": "clopidogrel",
        "unit_size": "10'S",
        "jan_aushadhi_price": 20.0
    }
])

# 2. Simulate the Gemini Vision output to bypass API call during tests
mock_scan_result = {
    "invoice_id": "INV-TEST-2026",
    "chemist_name": "Test Pharmacy",
    "line_items": [
        {
            "brand_name": "AUGMENTIN 625 DUO TAB",
            "extracted_salt": "Amoxicillin 500mg + Clavulanic Acid 125mg",
            "quantity_units": 10,
            "batch_number": "B123",
            "printed_mrp": 223.40,
            "paid_price": 220.00,
            "dpco_ceiling_price": 18.00  # 18 * 10 = 180 * 1.12 GST = 201.60 Ceiling Pack Price
        },
        {
            "brand_name": "NIMESULIDE PIO",
            "extracted_salt": "Nimesulide + Pioglitazone",
            "quantity_units": 10,
            "batch_number": "B124",
            "printed_mrp": 100.00,
            "paid_price": 100.00,
            "dpco_ceiling_price": None
        },
        {
            "brand_name": "CLOPIDOGREL TAB",
            "extracted_salt": "Clopidogrel 75mg",
            "quantity_units": 10,
            "batch_number": "B125",
            "printed_mrp": 80.00,
            "paid_price": 80.00,
            "dpco_ceiling_price": None
        },
        {
            "brand_name": "OMEPRAZOLE CAP",
            "extracted_salt": "Omeprazole 20mg",
            "quantity_units": 10,
            "batch_number": "B126",
            "printed_mrp": 50.00,
            "paid_price": 50.00,
            "dpco_ceiling_price": None
        }
    ]
}

async def run_pipeline():
    # Patch Gemini call
    with patch("app.routes.scanner._call_gemini_vision", return_value=mock_scan_result):
        # Create a mock UploadFile
        mock_file = MagicMock(spec=UploadFile)
        mock_file.content_type = "image/jpeg"
        mock_file.filename = "test.jpg"
        
        async def mock_read():
            return b"fake_image_bytes"
            
        mock_file.read = mock_read
        
        print("Running pipeline...")
        report = await upload_invoice_image(mock_file)
        
        print("\n--- FINAL AUDIT REPORT ---")
        print(json.dumps(report.model_dump(), indent=2))
        
        # Asserts
        print("\nRunning Asserts...")
        # 1. Overcharge check
        # Augmentin: printed=223.40, paid=220.00, ceiling=18.00*10=180.00 * 1.12 = 201.60. Paid 220 - 201.60 = 18.40 overcharge.
        aug_item = next(i for i in report.audited_items if i.brand_name == "AUGMENTIN 625 DUO TAB")
        assert aug_item.audit_summary.is_overcharged == True
        assert abs(aug_item.audit_summary.overcharge_amount - 18.40) < 0.01
        
        print("Overcharge math verified!")
        
        # 3. Regulatory ban warning
        nim_item = next(i for i in report.audited_items if i.brand_name == "NIMESULIDE PIO")
        assert nim_item.regulatory_summary.is_banned == True
        print("Regulatory ban verified!")
        clop_ome_alert = next((a for a in report.ddi_summary["alerts"] 
                               if (a["drug_a"] == "clopidogrel" and a["drug_b"] == "omeprazole") or 
                                  (a["drug_b"] == "clopidogrel" and a["drug_a"] == "omeprazole")), None)
        assert clop_ome_alert is not None
        assert clop_ome_alert["severity"] == "HIGH"
        print("DDI check verified!")
        
        print("\n[SUCCESS] Pipeline passed all verification checks!")

if __name__ == "__main__":
    # Fix seed JA price to 5.0 per tablet
    db["Generic_Inventory"].update_one(
        {"drug_code": "TEST_001"}, 
        {"$set": {"jan_aushadhi_price": 5.0}}
    )
    asyncio.run(run_pipeline())
