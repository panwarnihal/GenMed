# PROJECT_CONTEXT.md — GenMed: Single Source of Truth

> **Purpose:** This file is the definitive context anchor for any AI coding assistant or developer joining the GenMed project. It describes the full project scope, the exact repository layout, the live database infrastructure, every existing file and its role, the phased implementation roadmap, and strict engineering guardrails. Read this file before writing any code.

---

## 1. Executive Summary & System Goals

GenMed is a deterministic, exact-match generic medicine mapping and healthcare safety platform for the Indian market. It replaces probabilistic drug-search tools with a zero-risk cryptographic substitution engine and extends into regulatory compliance, visual bill auditing, and clinical drug interaction checking.

**Alignment:** UN SDG 3 (Good Health and Well-being) & UN SDG 9 (Industry, Innovation, and Infrastructure).

### 1.1 The Four Core Feature Pillars

| # | Feature | Status | Description |
|---|---------|--------|-------------|
| 1 | **Generic Medicine Mapping** | 🟡 In Progress (Day 1 Focus) | Maps branded drug prescriptions to affordable Jan Aushadhi (PMBJP) government generics (~2,500 products) via SHA-256 exact-match salt hashing and MongoDB Atlas Search. |
| 2 | **CDSCO Regulatory Compliance** | 🔴 Not Started (Phase 3) | Verifies formulations against CDSCO registries; flags banned Fixed Dose Combinations (FDCs) and Schedule H/H1/X restrictions. |
| 3 | **OCR + NLP Invoice Scanner & Price Auditor** | 🔴 Not Started (Phase 4) | Ingests messy Indian pharmacy tax bills / strip foil photos via OCR (Vision API/Textract), extracts structured JSON via fine-tuned medical NER, audits prices against legal MRPs and NPPA/DPCO Schedule-I ceiling prices. |
| 4 | **Drug-Drug Interaction (DDI) Checker** | 🟡 Stub Exists (Phase 5) | Cross-references multi-item prescriptions against RxNorm/OpenFDA matrices for severity-stratified clinical alerting. Currently uses a hardcoded rule base of 3 known interactions. |

### 1.2 Secondary Features (Future Phases)

- **Geospatial Jan Aushadhi Kendra Locator:** MongoDB `$near` on `2dsphere` indexes to find nearest physical Jan Aushadhi pharmacies.
- **Epidemiological Surveillance Heatmap (Admin):** Aggregate search queries by chemical salt and region over 48-hour windows.
- **CDSCO Batch Verification (OSINT):** Users search batch numbers to check CDSCO "Not of Standard Quality" (NSQ) or spurious recall lists. A basic endpoint already exists.

---

## 2. Repository Structure & File Map

Every file and directory in the repo is documented below so any AI can immediately locate the right code to modify.

```
D:\GenMed\
│
├── PROJECT_CONTEXT.md          ← THIS FILE. Read first.
├── README.md                   ← Public-facing project overview with architecture mermaid diagram.
│
├── backend/                    ← Python / FastAPI microservice (the core engine)
│   ├── .env                    ← MONGO_URI and DB_NAME for MongoDB Atlas connection.
│   ├── main.py                 ← FastAPI app with 3 API endpoints:
│   │                              GET  /api/v1/substitute?brand=<name>
│   │                              GET  /api/v1/verify-batch/<batch_number>
│   │                              POST /api/v1/check-interactions  {salts: [...]}
│   ├── utils_hasher.py         ← generate_salt_hash() — normalizes ingredient lists,
│   │                              alphabetizes, and returns SHA-256 hash + canonical string.
│   ├── seed_db.py              ← Seeds MongoDB with 3 branded drugs, 3 generics, 2
│   │                              blacklisted batches. Creates indexes on salt_composition_hash
│   │                              and batch_number.
│   ├── test_db.py              ← Quick MongoDB Atlas connectivity test (ping).
│   └── venv/                   ← Python virtual environment (do NOT commit).
│
├── gateway/                    ← Node.js / Express API Gateway (proxy layer)
│   ├── .env                    ← PORT=5000, FASTAPI_BASE_URL=http://127.0.0.1:8000
│   ├── server.js               ← Express server that proxies 3 routes to FastAPI backend:
│   │                              GET  /api/v1/substitute
│   │                              GET  /api/v1/verify-batch/:batchNumber
│   │                              POST /api/v1/check-interactions
│   ├── package.json            ← Dependencies: express@5, axios, cors, dotenv, nodemon.
│   └── node_modules/           ← (do NOT commit)
│
├── frontend/                   ← React.js + Vite client application
│   ├── index.html              ← Vite HTML entry point.
│   ├── vite.config.js          ← Vite config with React plugin.
│   ├── package.json            ← Dependencies: react@19, react-dom@19, axios. Dev: vite@8.
│   ├── src/
│   │   ├── main.jsx            ← React DOM root mount (StrictMode).
│   │   ├── App.jsx             ← Main app component. Contains:
│   │   │                          - Search bar with text input (not yet autocomplete-constrained)
│   │   │                          - Quick-select demo buttons: Brilinta 90mg, Augmentin 625 Duo, Lipitor 10mg
│   │   │                          - Split-card comparison view (branded vs generic)
│   │   │                          - Savings banner with percentage + annual estimate
│   │   │                          - Failsafe box when no SHA-256 match exists
│   │   │                          - Calls GET http://localhost:5000/api/v1/substitute?brand=<name>
│   │   ├── App.css             ← Component styles (dark theme, split-card, savings banner, failsafe).
│   │   ├── index.css           ← Global/reset styles (Vite scaffold, light/dark scheme support).
│   │   └── assets/             ← Static assets (currently empty).
│   └── node_modules/           ← (do NOT commit)
│
├── data-scripts/               ← EMPTY. Intended for CSV cleaning and Atlas seeding scripts.
│
└── docs/
    ├── srs/
    │   └── GenMed_SRS_v1.0.md  ← Full Software Requirements Specification (315 lines).
    │                              Contains FR-1 through FR-11, NFR-1 through NFR-5,
    │                              sequence diagrams, ERD, and database JSON schemas.
    ├── presentation/
    │   └── GenMed_Presentation.pptx  ← Capstone presentation slides.
    └── temp_docs/
        └── pharma_implementation_plan.md  ← Master implementation plan for Phases 3–6
                                              (CDSCO, OCR/NLP, NPPA Audit, DDI Engine).
                                              Contains sprint timeline (12 weeks / 6 sprints).
```

---

## 3. Technology Stack & Runtime Details

### 3.1 Backend — Python / FastAPI

| Item | Detail |
|------|--------|
| **Runtime** | Python 3.14 (system-installed at `C:\Python314\`) |
| **Virtual Env** | `backend/venv/` (activate via `backend\venv\Scripts\activate`) |
| **Framework** | FastAPI |
| **Database Driver** | PyMongo (direct MongoDB driver) |
| **Key Packages** | `fastapi`, `pymongo`, `python-dotenv`, `pydantic` |
| **Start Command** | `cd backend && venv\Scripts\uvicorn main:app --reload` |
| **Runs On** | `http://127.0.0.1:8000` |

### 3.2 Gateway — Node.js / Express

| Item | Detail |
|------|--------|
| **Framework** | Express 5 |
| **Key Packages** | `axios`, `cors`, `dotenv`, `nodemon` (dev) |
| **Start Command** | `cd gateway && npm run dev` (uses nodemon) |
| **Runs On** | `http://localhost:5000` |
| **Role** | Proxies all `/api/v1/*` requests to FastAPI at `http://127.0.0.1:8000` |

### 3.3 Frontend — React / Vite

| Item | Detail |
|------|--------|
| **Framework** | React 19 + Vite 8 |
| **Key Packages** | `react`, `react-dom`, `axios` |
| **Start Command** | `cd frontend && npm run dev` |
| **Runs On** | `http://localhost:5173` (Vite default) |
| **API Target** | Hardcoded to `http://localhost:5000/api/v1` in `App.jsx` line 5 |

### 3.4 Startup Order

**All three services must be running simultaneously:**

```
1. Backend (FastAPI):   cd backend  && venv\Scripts\uvicorn main:app --reload
2. Gateway (Express):   cd gateway  && npm run dev
3. Frontend (Vite):     cd frontend && npm run dev
```

---

## 4. Infrastructure & Database Schema (MongoDB Atlas: `genmed_db`)

### 4.1 Connection Details

- **Provider:** MongoDB Atlas (cloud-hosted).
- **Cluster:** `Cluster0` (`cluster0.giebjt2.mongodb.net`).
- **Database Name:** `genmed_db`.
- **Connection String:** Stored in `backend/.env` as `MONGO_URI`.
- **Auth:** Username/password embedded in URI (Atlas DB User).

### 4.2 Current Collections (as seeded by `seed_db.py`)

The current seed data uses legacy collection names from the initial prototype. These are being migrated to the canonical names listed in the instructions.

| # | Current Collection Name | Target Canonical Name | Documents | Description |
|---|------------------------|-----------------------|-----------|-------------|
| 1 | `Branded_Drugs` | `genmeds` | 3 | Commercial branded medicine catalog with `brand_name`, `manufacturer`, `active_ingredients[]`, `salt_composition_hash`, `mrp_price`. |
| 2 | `Generic_Inventory` | `janaushadhi_master` | 3 | PMBJP government generic catalog with `drug_code`, `generic_name`, `active_ingredients[]`, `salt_composition_hash`, `jan_aushadhi_price`, `unit_size`. |
| 3 | `Blacklisted_Batches` | (keep as-is) | 2 | CDSCO OSINT spurious/NSQ batch recall alerts with `drug_name`, `batch_number`, `reason_for_recall`, `alert_month`. |

### 4.3 Indexes Deployed

- `Branded_Drugs.salt_composition_hash` — For deterministic hash lookups.
- `Generic_Inventory.salt_composition_hash` — For exact-match generic mapping.
- `Blacklisted_Batches.batch_number` — For batch verification queries.

> **Future:** 6 Atlas Search indexes (Lucene-backed) will replace simple field indexes for the `janaushadhi_master`, `genmeds`, and `salt_mappings` collections to enable typo-tolerant, fuzzy, order-agnostic compound salt matching from OCR reads.

### 4.4 Schema Examples

**`Branded_Drugs` (current) / `genmeds` (target):**
```json
{
  "_id": "ObjectId('...')",
  "brand_name": "Augmentin 625 Duo",
  "manufacturer": "GSK",
  "active_ingredients": [
    { "salt": "Clavulanic Acid", "strength": "125mg" },
    { "salt": "Amoxicillin", "strength": "500mg" }
  ],
  "salt_composition_hash": "a1b2c3...sha256hex",
  "canonical_salt_string": "amoxicillin_500mg|clavulanic acid_125mg",
  "mrp_price": 200.0
}
```

**`Generic_Inventory` (current) / `janaushadhi_master` (target):**
```json
{
  "_id": "ObjectId('...')",
  "drug_code": "PMBI-0421",
  "generic_name": "Amoxicillin & Potassium Clavulanate Tablets 625 mg",
  "active_ingredients": [
    { "salt": "Amoxicillin", "strength": "500mg" },
    { "salt": "Clavulanic Acid", "strength": "125mg" }
  ],
  "salt_composition_hash": "a1b2c3...sha256hex",
  "canonical_salt_string": "amoxicillin_500mg|clavulanic acid_125mg",
  "jan_aushadhi_price": 50.0,
  "unit_size": "10 Tablets"
}
```

**`Blacklisted_Batches`:**
```json
{
  "_id": "ObjectId('...')",
  "drug_name": "Brilinta 90mg (Counterfeit Alert)",
  "batch_number": "BT1089X",
  "manufacturer_on_label": "AstraZeneca (Spurious Label)",
  "reason_for_recall": "Spurious / Counterfeit batch detected by CDSCO North Zone",
  "alert_month": "July 2026"
}
```

### 4.5 The Salt Hashing Algorithm (`utils_hasher.py`)

The `generate_salt_hash()` function is the heart of the deterministic engine:
1. Receives a list of `{ "salt": "...", "strength": "..." }` dicts.
2. Strips whitespace, lowercases both salt and strength.
3. Creates `"salt_strength"` tokens (e.g., `"amoxicillin_500mg"`).
4. **Alphabetically sorts** the tokens so ingredient order never matters.
5. Joins tokens with `|` into a canonical string.
6. Returns the **SHA-256 hex digest** of that canonical string.

**Critical invariant:** A branded drug and its generic equivalent with identical active ingredients at identical strengths will ALWAYS produce the same hash, regardless of the order the ingredients are listed.

---

## 5. Core Engine Pipelines

### 5.1 Pipeline 1: Generic Mapping via Exact-Match Hash (IMPLEMENTED)

```
User searches "Augmentin 625 Duo"
  → Backend finds branded drug record in Branded_Drugs collection
  → Reads its salt_composition_hash
  → Queries Generic_Inventory for identical hash
  → Match found → returns generic name, price, and savings calculation
  → No match → FAILSAFE_TRIGGERED (no probabilistic fallback, ever)
```

**Savings calculation:**
- `saved_rupees = branded.mrp_price - generic.jan_aushadhi_price`
- `saved_percentage = ((branded - generic) / branded) * 100`
- `annual_savings_estimate = saved_rupees * 52` (chronic usage assumption)

### 5.2 Pipeline 2: CDSCO Batch Verification (IMPLEMENTED — basic)

```
User submits batch number (e.g., "BT1089X")
  → Backend normalizes to uppercase, queries Blacklisted_Batches
  → Match found → DANGER_BLACKLISTED / RED_ALERT
  → No match → SAFE / GREEN_VERIFIED
```

### 5.3 Pipeline 3: Drug-Drug Interaction Check (STUB — hardcoded rules)

```
User submits list of salt names
  → Backend normalizes to lowercase, checks against 3 hardcoded rule pairs:
     • Ticagrelor + Aspirin (MODERATE_TO_HIGH)
     • Amoxicillin + Methotrexate (HIGH)
     • Atorvastatin + Clarithromycin (HIGH)
  → Returns detected warnings or SAFE_COMBINATION
```

> **TODO:** Replace hardcoded rules with RxNorm/OpenFDA clinical interaction matrix queries.

### 5.4 Pipeline 4: OCR → NER Extraction (NOT STARTED)

Will extract structured JSON from pharmacy bill images. Target NER schema:
```json
{
  "brand_name": "AUGMENTIN 625 DUO",
  "quantity_units": 10,
  "form_factor": "TABLET",
  "batch_number": "C2381",
  "expiry_date": "2027-08",
  "printed_mrp_per_pack": 223.40,
  "paid_price_total": 223.40
}
```

### 5.5 Pipeline 5: NPPA/DPCO Price Audit (NOT STARTED)

Will compare `paid_price` against two statutory thresholds:
- **Threshold 1:** Printed MRP (selling above MRP is illegal under Legal Metrology Act).
- **Threshold 2:** DPCO Schedule-I ceiling price (for essential medicines, NPPA notifies maximum unit price).

### 5.6 Data Preprocessing & Canonicalization Rule

All drug compositions are normalized into a `canonical_salt_key` by:
1. Lowercasing and stripping pharmacopeial noise tags (`IP`, `BP`, `USP`, `Trihydrate`, `Hydrochloride`, `Tablet`, `SR`, etc.).
2. Normalizing unit weights without spacing (`500 mg` → `500mg`).
3. Alphabetically sorting multi-salt components joined by underscores or pipes.

---

## 6. API Endpoint Reference

All endpoints are proxied through the Gateway (`localhost:5000`) to the FastAPI backend (`localhost:8000`).

| Method | Gateway URL | FastAPI URL | Purpose | Status |
|--------|-------------|-------------|---------|--------|
| `GET` | `/api/v1/substitute?brand=<name>` | Same | Deterministic generic mapping | ✅ Working |
| `GET` | `/api/v1/verify-batch/:batchNumber` | `/api/v1/verify-batch/<batch_number>` | CDSCO batch blacklist check | ✅ Working |
| `POST` | `/api/v1/check-interactions` | Same | DDI salt interaction check | ✅ Working (stub) |

### Response Shapes

**Substitute (SUCCESS):**
```json
{
  "status": "SUCCESS",
  "match_type": "DETERMINISTIC_SHA256_EXACT",
  "salt_composition_hash": "...",
  "branded_drug": { ... },
  "generic_match": { ... },
  "savings": {
    "saved_rupees": 150.0,
    "saved_percentage": 75.0,
    "annual_savings_estimate": 7800.0
  }
}
```

**Substitute (FAILSAFE):**
```json
{
  "status": "FAILSAFE_TRIGGERED",
  "message": "No exact deterministic chemical match found...",
  "branded_drug": { ... },
  "generic_match": null,
  "savings": null
}
```

---

## 7. Phased Implementation Roadmap

| Phase | Module | Status | Key Deliverables |
|-------|--------|--------|------------------|
| **1–2** | Core Infra & Generic Mapping | 🟡 In Progress | MongoDB setup, SHA-256 hash engine, FastAPI endpoints, Express gateway, React search UI, seed data. **Current focus.** |
| **3** | CDSCO Regulatory Compliance | 🔴 Not Started | Ingest CDSCO approved APIs & banned FDC gazettes. Parse combination brands into active ingredients. Return compliance badges (APPROVED / BANNED_FDC / SCHEDULE_H1). |
| **4** | OCR/NLP Invoice Scanner + NPPA Audit | 🔴 Not Started | Vision API/Textract OCR integration. Fine-tuned medical NER. DPCO Schedule-I ceiling price indexing. Overcharge math engine. |
| **5** | DDI Safety Knowledge Graph | 🔴 Not Started | Replace hardcoded rules with RxNorm/OpenFDA graph queries. Support 15+ concurrent medications. Severity stratification (High/Moderate/Low). |
| **6** | End-to-End Polish & Launch | 🔴 Not Started | Unified audit report UI. Load testing (<3s SLA). Medico-legal disclaimer audit. Production deployment. |

### What Needs to Happen Right Now (Phase 1–2 Completion)

1. **Validate the end-to-end mapping flow:** Start all 3 services, search for a branded drug, confirm the correct generic match and savings are displayed.
2. **Scale seed data:** Move from 3 test drugs to the full ~2,500 Jan Aushadhi catalog. Import real PMBJP CSV data.
3. **Implement autocomplete:** The search input currently accepts free text. Per FR-1, it must constrain input via a dropdown populated from indexed MongoDB fields.
4. **Set up Atlas Search indexes:** Transition from simple field indexes to Lucene-backed Atlas Search indexes for fuzzy/typo-tolerant matching.
5. **Populate `data-scripts/` folder** with CSV cleaning and upsert scripts.
6. **Rename collections** from prototype names (`Branded_Drugs`, `Generic_Inventory`) to canonical names (`genmeds`, `janaushadhi_master`).

---

## 8. Data Versioning & Seeding Strategy

- **Raw and cleaned Jan Aushadhi CSV files** should be committed under a `data/` folder in the repository for reproducible local seeding.
- The seeding/upsert script must push cleaned catalog updates directly into `genmed_db` using **upserts** — explicitly **without dropping Atlas Search indexes** to ensure zero downtime.
- The `data-scripts/` directory is intended for all CSV preprocessing, normalization, and MongoDB bulk-import scripts.

---

## 9. Engineering Guardrails (MANDATORY)

Any AI coding assistant or developer contributing to this repository **MUST** adhere to these rules:

1. **Always use MongoDB Atlas Search** for drug matching. Use `$search` aggregation pipelines. Do NOT implement fallback regex scripts, Levenshtein distance in application code, or probabilistic cosine similarity for matching logic.
2. **Never suggest migrating to SQLite, PostgreSQL, or any SQL database.** The entire search pipeline is built on MongoDB Atlas Search with Lucene indexes.
3. **Never use probabilistic/AI-generated drug substitutions.** The mapping engine must be 100% deterministic (exact SHA-256 hash match or FAILSAFE). Zero tolerance for "close enough" matches.
4. **Prioritize engine accuracy over UI polish.** Always validate and optimize core mapping accuracy and database logic before building out frontend features.
5. **Preserve Atlas Search indexes.** Any data migration or seeding script must use upserts, not `drop()` + `insert()`.
6. **Windows development environment.** All commands must work on Windows / PowerShell. Paths use backslashes in the shell but forward slashes in code.
7. **Environment variables stay in `.env` files**, never hardcoded in source (except the frontend API URL which is currently hardcoded and should be moved to a Vite env var).

---

## 10. Known Issues & Technical Debt

| Issue | Location | Notes |
|-------|----------|-------|
| Emoji characters in print statements cause `UnicodeEncodeError` on Windows (cp1252) | `backend/test_db.py` | Fixed in `seed_db.py`, still present in `test_db.py`. |
| Frontend API URL is hardcoded | `frontend/src/App.jsx` line 5 | Should use `import.meta.env.VITE_API_URL`. |
| Search input is free-text, not autocomplete-constrained | `frontend/src/App.jsx` | Per SRS FR-1, must be dropdown-based. |
| DDI checker uses only 3 hardcoded rules | `backend/main.py` lines 159–175 | Must be replaced with RxNorm/OpenFDA matrix queries. |
| Collection names don't match target schema | `backend/main.py`, `seed_db.py` | Using `Branded_Drugs`/`Generic_Inventory` instead of `genmeds`/`janaushadhi_master`. |
| `data-scripts/` directory is empty | `data-scripts/` | Needs CSV cleaning and Atlas seeding scripts. |
| `index.css` has Vite scaffold styles that conflict with `App.css` theme | `frontend/src/index.css` | Light-mode defaults from Vite scaffold override the dark theme in `App.css`. |
| Only 3 branded + 3 generic drugs seeded | `backend/seed_db.py` | Need full ~2,500 PMBJP catalog import. |
| `salt_mappings` collection referenced in design but not yet created | Database | Canonical tokenized salt lexicon collection. |
| No authentication or rate limiting implemented | Gateway | SRS mentions auth handler but none exists. |

---

## 11. Key Documents Reference

| Document | Path | Purpose |
|----------|------|---------|
| This context file | `PROJECT_CONTEXT.md` | AI/developer onboarding anchor |
| Software Requirements Specification | `docs/srs/GenMed_SRS_v1.0.md` | Full FR/NFR, sequence diagrams, ERD, schemas |
| Master Implementation Plan (Phases 3–6) | `docs/temp_docs/pharma_implementation_plan.md` | Sprint timeline, CDSCO/OCR/NLP/DDI technical breakdown |
| Project README | `README.md` | Public overview, architecture diagram, feature list |
| Capstone Presentation | `docs/presentation/GenMed_Presentation.pptx` | 12-slide deck for academic submission |
