# Project Context: GenMed

## 1. Executive Summary & System Goals

GenMed is an advanced healthcare informatics and exact-match generic medicine mapping platform. It bridges the gap between expensive branded prescriptions and affordable, government-subsidized generic equivalents available via the Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP) network.

**Project Mission & Core Features:**
- **Generic Medicine Mapping (Day 1 Focus):** Deterministically mapping commercial/branded drug line items to affordable government alternatives using the official Jan Aushadhi (PMBI) dataset (comprising ~2,500 verified products).
- **CDSCO Regulatory Compliance:** Verifying drug formulations against Central Drugs Standard Control Organisation (CDSCO) registries to actively flag banned Fixed Dose Combinations (FDCs) or drugs subject to Schedule H/H1/X restrictions.
- **OCR + NLP Invoice Scanner & Price Auditor:** Ingesting messy, unstructured Indian pharmacy tax bills and strip foil photos via OCR (Vision API/Textract) and extracting structured JSON line items via a fine-tuned medical Named Entity Recognition (NER) pipeline. It audits paid prices against legal Maximum Retail Prices (MRPs) and statutory NPPA / DPCO Schedule-I ceiling thresholds to prevent overcharging.
- **Drug-Drug Interaction (DDI) Checker:** Cross-referencing multi-item prescriptions or patient medicine cabinets against clinical matrices (such as RxNorm and OpenFDA) for severity-stratified alerting on dangerous drug interactions.

---

## 2. Infrastructure & Database Schema (MongoDB Atlas: `genmed_db`)

The GenMed backend relies on MongoDB Atlas as its ground truth data store, leveraging its native, Lucene-backed search capabilities.

- **Cluster:** `Cluster0` on MongoDB Atlas.
- **Database Name:** `genmed_db`.
- **Current Footprint:** Exactly 3 collections and 6 deployed indexes.

### The 3 Core Collections

1. **`janaushadhi_master`**: The PMBI government catalog containing statutory generic names, canonical salt keys, unit sizes, and ceiling MRPs.
2. **`genmeds`**: The commercial/branded medicine catalog (incrementally ingested from chemist catalogs and parsed bills).
3. **`salt_mappings`**: Canonical tokenized salt lexicons acting as the bridge linking branded compound drugs to their generic compositions.

### Why Atlas Search is Required

GenMed explicitly utilizes **MongoDB Atlas Search** (`$search` aggregation pipelines powered by Apache Lucene indexing) over standalone regex, fuzzy string-matching scripts, or traditional probabilistic AI search. The 6 deployed indexes handle:
- Typo-tolerance (`maxEdits`) and fuzzy character matching for messy OCR reads.
- Order-agnostic compound salt matching (e.g., confidently matching `"Amoxicillin + Clavulanate"` to `"Clavulanate + Amoxycillin"`).

### Schema Examples

**Sample Document: `janaushadhi_master`**
```json
{
  "_id": "ObjectId('...')",
  "drug_code": "PMBI-0421",
  "generic_name": "Amoxicillin & Potassium Clavulanate Tablets 625 mg",
  "canonical_salt_key": "amoxicillin_500mg|clavulanic_acid_125mg",
  "unit_size": "10 Tablets",
  "jan_aushadhi_price": 50.00
}
```

**Sample Document: `genmeds`**
```json
{
  "_id": "ObjectId('...')",
  "brand_name": "Augmentin 625 Duo",
  "manufacturer": "GSK",
  "canonical_salt_key": "amoxicillin_500mg|clavulanic_acid_125mg",
  "mrp_price": 200.00
}
```

---

## 3. Core Engine Pipelines

### Data Preprocessing & Canonicalization Rule
To achieve exact-match mapping, all drug compositions must be normalized into a strict `canonical_salt_key` before hashing or indexing:
1. **Cleaning:** Lowercase all text and aggressively strip pharmacopeial noise tags (e.g., `IP`, `BP`, `USP`, `Trihydrate`, `Hydrochloride`, `Tablet`, `SR`).
2. **Standardizing Units:** Normalize unit weights without internal spacing (e.g., `500 mg` becomes `500mg`).
3. **Ordering:** Alphabetically sort multi-salt components (joined by underscores or pipes) so that the chemical order never affects the resulting hash or search query.

### OCR -> NER Extraction Pipeline
Raw pharmacy bills are passed through OCR (e.g., Textract) to retrieve unstructured text. This text is piped into a fine-tuned Medical NER model which maps extracted strings to structured entities: `brand_name`, `quantity`, `batch_number`, `expiry_date`, and `paid_price`. 

### NPPA Overcharge Math & Auditing
Extracted line items are cross-referenced with `genmeds` and `janaushadhi_master`. The audit engine calculates potential overcharges mathematically by comparing the user's `paid_price` against DPCO Schedule-I ceiling prices, generating immediate dispute alerts for any price exceeding the statutory limit.

---

## 4. Current Phase & Engineering Guardrails

### Repository & Data Versioning Strategy
- Raw and cleaned Jan Aushadhi CSV files are committed under the `data/` folder in the repository for easy local seeding and version tracking.
- The seeding/upsert script is designed to push cleaned catalog updates directly into `genmed_db` using upserts, explicitly **without dropping Atlas Search indexes** to ensure zero downtime.

### Strict Engineering Guardrails
Any AI coding assistant or developer contributing to this repository **MUST** adhere to the following rules:
1. **Always use Atlas Search:** Rely on `$search` aggregations for drug matching. Do not attempt to implement fallback regex scripts or probabilistic cosine similarity for matching logic.
2. **Database Integrity:** Never suggest migrating to SQLite, PostgreSQL, or other SQL databases. The entire search pipeline relies on MongoDB Atlas Search.
3. **Prioritization:** Always validate and optimize core mapping accuracy and database logic before building out UI features. The engine's exact-match integrity is the most critical component.
