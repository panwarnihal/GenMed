# PROJECT_CONTEXT.md — GenMed: Single Source of Truth

> **Purpose:** This file is the definitive context anchor for any AI coding assistant or developer joining the GenMed project. It describes the full project scope, the exact repository layout, the live database infrastructure, every existing file and its role, the phased implementation roadmap, and strict engineering guardrails. Read this file before writing any code.
>
> **Last Updated:** 2026-08-16

---

## 1. Executive Summary & System Goals

GenMed is a deterministic, exact-match generic medicine mapping and healthcare safety platform for the Indian market. It replaces probabilistic drug-search tools with a zero-risk cryptographic substitution engine and extends into regulatory compliance, visual bill auditing, and clinical drug interaction checking.

**Alignment:** UN SDG 3 (Good Health and Well-being) & UN SDG 9 (Industry, Innovation, and Infrastructure).

### 1.1 The Four Core Feature Pillars

| # | Feature | Status | Description |
|---|---------|--------|-------------|
| 1 | **Generic Medicine Mapping** | ✅ Working | Maps branded drug prescriptions to affordable Jan Aushadhi (PMBJP) government generics via `canonical_salt_key` normalization + MongoDB Atlas Search (`$search` aggregation). Frontend has full search form (brand + salt + price), live demo presets, animated score ring, savings bar, and no-match fallback card. |
| 2 | **CDSCO Regulatory Compliance** | 🟡 Seeded + Service Live | `regulatory_service.py` checks every line item against a MongoDB `cdsco_regulations` collection (1h TTL cache + LRU). `seed_cdsco.py` seeds 6 banned FDCs and 7 Schedule H1 drugs. Called automatically by the invoice scanner pipeline. |
| 3 | **OCR + NLP Invoice Scanner & Price Auditor** | ✅ Backend Complete, Frontend UI Live | `POST /api/v1/scanner/upload` accepts JPG/PNG/WEBP (≤10 MB), calls **Google Gemini 1.5 Flash** Vision with a strict medical NER extraction prompt, validates output through Pydantic, runs mapping engine per line item, calculates MRP overcharges, and runs a batch DDI check. Returns a fully typed `FinalAuditReport`. Frontend `BillAuditor.jsx` has drag-and-drop upload zone, sample bill simulator, animated progress bar, three metric cards (total billed / overcharges / generic savings), a stacked savings bar, and an itemized audit table with per-row generic alternatives. |
| 4 | **Drug-Drug Interaction (DDI) Checker** | ✅ Production-Grade (In-Memory) | `ddi_service.py` has a comprehensive bidirectional `DDI_MATRIX` covering 20+ clinically documented pairs across 8 drug categories (antiplatelets, anticoagulants, antibiotics, statins, cardiac, ACE inhibitors, diabetes, antidepressants, seizure). Fully pairwise exhaustive O(n²), severity-ranked (HIGH→MODERATE→LOW), and auto-called at the end of every invoice scan. |

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
├── README.md                      ← Public-facing project overview with architecture mermaid diagram.
├── start-all.bat                  ← Windows batch script to start all 3 services in separate windows.
├── start-all.ps1                  ← PowerShell equivalent startup script.
│
├── backend/                       ← Python / FastAPI microservice (the core engine)
│   ├── .env                       ← MONGO_URI, DB_NAME, GEMINI_API_KEY
│   ├── main.py                    ← FastAPI app entry point. Registers CORS, includes routers (mapping, scanner),
│   │                                 and also hosts legacy endpoints directly:
│   │                                   GET  /                         → health check
│   │                                   GET  /api/v1/substitute        → SHA-256 hash-based brand→generic lookup
│   │                                   GET  /api/v1/verify-batch/:id  → CDSCO blacklist check
│   │                                   POST /api/v1/check-interactions → DDI rule stub (3 rules, legacy)
│   │                                   POST /api/v1/mapping/match     → Atlas Search endpoint (DUPLICATE — also in router)
│   ├── utils_hasher.py            ← Two core functions:
│   │                                   generate_salt_hash(active_ingredients)  → (sha256_hex, canonical_string)
│   │                                   generate_canonical_salt_key(text)       → pipe-delimited canonical string
│   ├── requirements.txt           ← fastapi, uvicorn, pydantic>=2.7, pymongo[srv], pandas, requests,
│   │                                 python-dotenv, google-genai>=0.3.0, python-multipart
│   ├── seed_db.py                 ← Seeds 3 branded drugs + 3 Jan Aushadhi generics + 2 blacklisted batches.
│   │                                 Computes SHA-256 hashes and creates field indexes.
│   ├── seed_generic_inventory.py  ← Bulk CSV→MongoDB upsert script. Reads data/raw/janaushadhi_master.csv,
│   │                                 computes canonical_salt_key per row, bulk-upserts into Generic_Inventory.
│   ├── seed_cdsco.py              ← Seeds cdsco_regulations collection: 6 banned FDCs + 7 Schedule H1 drugs.
│   │                                 Uses upserts; creates indexes on rule_type, canonical_salt_key, drug_name.
│   ├── test_db.py                 ← Quick MongoDB Atlas connectivity test (ping).
│   ├── test_atlasscript.py        ← Atlas Search query testing script.
│   ├── test_invoice_scanner.py    ← Integration test for the scanner endpoint using the requests library.
│   ├── utils_hasher.py            ← Core hashing + canonicalization module (see above).
│   └── app/
│       ├── __init__.py
│       ├── routes/
│       │   ├── __init__.py
│       │   ├── mapping.py         ← APIRouter at /api/v1/mapping/match (POST)
│       │   │                         Accepts { query, extracted_salt }. Runs Lucene compound $search
│       │   │                         on canonical_salt_key (5x boosted) + fuzzy generic_name match.
│       │   │                         Falls back to regex find if Atlas Search index is compiling.
│       │   └── scanner.py         ← APIRouter at /api/v1/scanner/upload (POST multipart/form-data)
│       │                             Full OCR→NER→Mapping→Audit→DDI pipeline. See Section 5.3.
│       └── services/
│           ├── regulatory_service.py ← check_regulatory_status(canonical_salt_key):
│           │                            Checks banned FDCs and Schedule H1 drugs from MongoDB
│           │                            cdsco_regulations with 1h TTL + LRU(1024) caching.
│           └── ddi_service.py        ← check_batch_interactions(canonical_salts) + build_ddi_summary():
│                                        Bidirectional DDI_MATRIX with 20+ pairs across 8 drug categories.
│                                        Pairwise O(n²), severity-sorted (HIGH→MODERATE→LOW).
│
├── gateway/                       ← Node.js / Express API Gateway (proxy layer)
│   ├── .env                       ← PORT=5000, FASTAPI_BASE_URL=http://127.0.0.1:8000
│   ├── server.js                  ← Express server proxying 4 routes to FastAPI:
│   │                                   GET  /api/v1/substitute
│   │                                   GET  /api/v1/verify-batch/:batchNumber
│   │                                   POST /api/v1/check-interactions
│   │                                   POST /api/v1/mapping/match
│   └── package.json               ← express@5, axios, cors, dotenv, nodemon
│
├── frontend/                      ← React 19 + Vite 8 + Tailwind CSS client application
│   ├── index.html                 ← Vite HTML entry point.
│   ├── vite.config.js             ← Vite config with React plugin.
│   ├── tailwind.config.js         ← Custom Tailwind config with galaxy-dark design tokens.
│   ├── package.json               ← react@19, react-dom@19, react-router-dom, lucide-react, tailwindcss
│   └── src/
│       ├── main.jsx               ← React DOM root mount (StrictMode).
│       ├── App.jsx                ← BrowserRouter + 4 routes:
│       │                              /          → GenericFinder
│       │                              /auditor   → BillAuditor
│       │                              /about     → AboutUs
│       │                              /contact   → ContactUs
│       │                             Shared Layout wraps each: Navbar + main + footer.
│       │                             Health-polls FastAPI every 15s to track backend status.
│       ├── api.js                 ← Two exported functions:
│       │                              matchGenericAlternative(query, extractedSalt)
│       │                                → POST /api/v1/mapping/match directly to FastAPI :8000
│       │                              checkHealth() → GET / on FastAPI :8000
│       ├── index.css              ← Global styles + design tokens (glass-card, gm-input, btn-primary,
│       │                             gradient-text, skeleton, audit-row, drop-zone, animations).
│       └── components/
│           ├── Navbar.jsx         ← Sticky glassmorphic navbar. Desktop: GooeyNav (purple/violet palette,
│           │                         boxy 3px border-radius highlight). Mobile: slide-down menu.
│           │                         4 routes: MediMatch (/), BillSense (/auditor), About Us, Contact.
│           ├── GooeyNav.jsx       ← React Bits animated gooey navigation component.
│           ├── GooeyNav.css       ← Gooey SVG filter + particle animation styles.
│           ├── GenericFinder.jsx  ← Route: /  (brand name "MediMatch")
│           │                         Left column: title glass-card, search form (brand + salt + price),
│           │                           demo pill buttons (4 presets including Crocin Advance 500mg).
│           │                         Right column: LoadingSkeleton, ResultCard (split brand vs JA card,
│           │                           ScoreRing SVG, SavingsBar), NoMatchCard, "How it works" grid.
│           │                         Calls matchGenericAlternative() via api.js.
│           ├── BillAuditor.jsx    ← Route: /auditor  (brand name "BillSense")
│           │                         Drag-and-drop zone + sample bill simulator (4 hardcoded line items).
│           │                         Runs parallel matchGenericAlternative() per line item with progress %.
│           │                         Renders: 3 MetricCards (total billed / overcharges / generic savings),
│           │                           DonutRing SVG, stacked savings bar, itemized audit table
│           │                           with per-row: overcharge badge, Jan Aushadhi alt + price, savings.
│           │                         ⚠️ Note: file upload currently triggers sample bill (OCR backend
│           │                            not yet wired to frontend — scanner endpoint exists in backend only).
│           ├── AboutUs.jsx        ← About page with 3-column stats grid (glassy styling).
│           └── ContactUs.jsx      ← Contact page.
│
├── data/
│   └── raw/
│       └── janaushadhi_master.csv ← PMBJP Jan Aushadhi product catalog CSV (raw source data,
│                                     249 KB). Used by seed_generic_inventory.py.
│
└── docs/
    ├── srs/
    │   └── GenMed_SRS_v1.0.md     ← Full Software Requirements Specification (FR-1 through FR-11,
    │                                  NFR-1 through NFR-5, sequence diagrams, ERD, DB JSON schemas).
    ├── status_updates/
    │   ├── PROJECT_CONTEXT.md     ← THIS FILE. Read first.
    │   ├── Status(12 aug).md      ← Status snapshot at Aug 12 (Phase 1 baseline + UI polish log).
    │   └── Status(16 aug).md      ← Status snapshot at Aug 16 (Phase 2–3 feature completion log).
    ├── presentation/
    │   └── GenMed_Presentation.pptx ← Capstone presentation slides.
    └── temp_docs/
        └── pharma_implementation_plan.md ← Master implementation plan for Phases 3–6.
```

---

## 3. Technology Stack & Runtime Details

### 3.1 Backend — Python / FastAPI

| Item | Detail |
|------|--------|
| **Runtime** | Python 3.14 (system-installed at `C:\Python314\`) |
| **Virtual Env** | `backend/venv/` (activate via `backend\venv\Scripts\activate`) |
| **Framework** | FastAPI with Uvicorn ASGI server |
| **Database Driver** | PyMongo (direct MongoDB driver, `pymongo[srv]`) |
| **Vision AI** | `google-genai >= 0.3.0` (Google Gemini 1.5 Flash) |
| **Key Packages** | `fastapi`, `uvicorn[standard]`, `pymongo[srv]`, `pydantic>=2.7`, `pandas`, `python-dotenv`, `google-genai`, `python-multipart` |
| **Start Command** | `cd backend && venv\Scripts\uvicorn main:app --reload` |
| **Runs On** | `http://127.0.0.1:8000` |
| **API Docs** | `http://127.0.0.1:8000/docs` (Swagger UI auto-generated) |

### 3.2 Gateway — Node.js / Express

| Item | Detail |
|------|--------|
| **Framework** | Express 5 |
| **Key Packages** | `axios`, `cors`, `dotenv`, `nodemon` (dev) |
| **Start Command** | `cd gateway && npm run dev` (uses nodemon) |
| **Runs On** | `http://localhost:5000` |
| **Role** | Proxies all `/api/v1/*` requests to FastAPI at `http://127.0.0.1:8000` |

### 3.3 Frontend — React / Vite / Tailwind

| Item | Detail |
|------|--------|
| **Framework** | React 19 + Vite 8 |
| **Styling** | Tailwind CSS with custom galaxy-dark design system |
| **UI Library** | Lucide React (icons), React Bits GooeyNav |
| **Routing** | `react-router-dom` (BrowserRouter, 4 routes) |
| **Key Packages** | `react`, `react-dom`, `react-router-dom`, `lucide-react`, `tailwindcss` |
| **Start Command** | `cd frontend && npm run dev` |
| **Runs On** | `http://localhost:5173` (Vite default) |
| **API Target** | `http://127.0.0.1:8000` hardcoded in `src/api.js` line 2 (bypasses gateway for mapping calls) |

### 3.4 Startup Order

**All three services must be running simultaneously.** The `start-all.bat` or `start-all.ps1` scripts in the root directory launch all three in separate terminal windows.

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

### 4.2 Collections

| # | Collection Name | Documents | Description |
|---|----------------|-----------|-------------|
| 1 | `Branded_Drugs` | 3 (seed) | Commercial branded medicine catalog. Fields: `brand_name`, `manufacturer`, `active_ingredients[]`, `salt_composition_hash`, `canonical_salt_string`, `mrp_price`. |
| 2 | `Generic_Inventory` | 3 (seed) + bulk CSV | PMBJP Jan Aushadhi generic catalog. Fields: `drug_code`, `generic_name`, `canonical_salt_key`, `unit_size`, `jan_aushadhi_price`. Bulk-populated via `seed_generic_inventory.py` from `janaushadhi_master.csv`. |
| 3 | `Blacklisted_Batches` | 2 | CDSCO OSINT spurious/NSQ batch recall alerts. Fields: `drug_name`, `batch_number`, `manufacturer_on_label`, `reason_for_recall`, `alert_month`. |
| 4 | `cdsco_regulations` | 13 | CDSCO compliance ruleset. Fields: `rule_type` (`BANNED_FDC` or `SCHEDULE_H1`), `canonical_salt_key` (for FDCs), `drug_name` (for H1), `status`, `message`. |

### 4.3 Indexes Deployed

| Collection | Field | Type | Purpose |
|-----------|-------|------|---------|
| `Branded_Drugs` | `salt_composition_hash` | Standard | Deterministic hash lookups |
| `Generic_Inventory` | `salt_composition_hash` | Standard | Exact-match generic mapping |
| `Blacklisted_Batches` | `batch_number` | Standard | Batch verification queries |
| `cdsco_regulations` | `rule_type` | Standard | Filter by FDC/Schedule H1 |
| `cdsco_regulations` | `canonical_salt_key` | Standard | Substring match for FDC checks |
| `cdsco_regulations` | `drug_name` | Standard | Exact match for H1 drugs |

> **Atlas Search:** A Lucene-backed `$search` index named `"default"` on `Generic_Inventory` is used by the mapping engine for fuzzy/typo-tolerant compound matching. This must be configured in the MongoDB Atlas UI under the cluster's Search tab.

### 4.4 The Two Hashing Functions (`utils_hasher.py`)

#### `generate_salt_hash(active_ingredients: List[Dict])` → `(sha256_hex, canonical_string)`
Used by `seed_db.py` to fingerprint structured `{salt, strength}` ingredient lists.
1. Lowercase + strip salt and strength.
2. Build `"salt_strength"` tokens (e.g., `"amoxicillin_500mg"`).
3. Alphabetically sort tokens (ingredient order never matters).
4. Join with `|` → canonical string.
5. SHA-256 hex digest of canonical string.

#### `generate_canonical_salt_key(text: str)` → `pipe-delimited string`
Used by the mapping engine, scanner pipeline, and regulatory service for free-text normalization.
1. Lowercase entire string.
2. Strip pharmacopeial noise (`IP`, `BP`, `USP`, `trihydrate`, `hydrochloride`, `SR`, `ER`, `acid`, etc.).
3. Normalize synonyms: `amoxycillin → amoxicillin`, `clavulanic → clavulanate`, `acetaminophen → paracetamol`.
4. Normalize unit spacing (`500 mg → 500mg`).
5. Split on `+` or `and`, strip non-alphanumeric characters.
6. Alphabetically sort tokens, join with `|`.

---

## 5. Core Engine Pipelines

### 5.1 Pipeline 1: Generic Mapping via Atlas Search (LIVE)

```
User types brand name + optional salt composition
  → POST /api/v1/mapping/match { query, extracted_salt }
  → utils_hasher.generate_canonical_salt_key(extracted_salt || query)
  → MongoDB $search compound pipeline:
      Priority 1: text match on canonical_salt_key (5x boosted)
      Priority 2: fuzzy text match on generic_name (maxEdits=1, prefixLength=3)
  → Returns { match_found: true, top_alternative: { drug_code, generic_name, jan_aushadhi_price, search_score } }
  → No match → { match_found: false }
  → Fallback: regex find on canonical_salt_key if Atlas Search index is compiling
```

### 5.2 Pipeline 2: Legacy SHA-256 Exact Match (LIVE — legacy endpoint)

```
GET /api/v1/substitute?brand=<name>
  → Case-insensitive regex on Branded_Drugs.brand_name
  → Read salt_composition_hash from branded record
  → Exact match query on Generic_Inventory.salt_composition_hash
  → Match: returns branded + generic + savings calculation
  → No match: FAILSAFE_TRIGGERED (never falls back to probabilistic)
```

### 5.3 Pipeline 3: OCR → NER → Audit → DDI (LIVE on backend)

```
POST /api/v1/scanner/upload (multipart image file)
  ├── 1. MIME type guard (JPG/PNG/WEBP/BMP, ≤10 MB)
  ├── 2. Gemini 1.5 Flash Vision call with deterministic NER prompt
  │         (temperature=0.1, response_mime_type="application/json")
  ├── 3. JSON extraction (_extract_json_block): strips markdown fences, finds outermost braces
  ├── 4. Pydantic validation (InvoiceScanResult → list of ExtractedLineItem)
  ├── 5. Per line-item loop:
  │     ├── matchGenericAlternative() → Jan Aushadhi alternative + price
  │     ├── Overcharge = paid_price > (mrp × qty) → True/False + amount
  │     ├── Generic savings = paid_price - (JA_price × qty)
  │     └── check_regulatory_status(canonical_salt_key) → APPROVED / BANNED / SCHEDULE_H1
  ├── 6. check_batch_interactions(all_canonical_salts) → DDI alerts across entire invoice
  └── Returns FinalAuditReport {
        invoice_id, total_paid, total_overcharge, total_potential_savings,
        audited_items[], ddi_summary { interaction_count, has_critical_interactions,
                                       severity_breakdown, alerts[] }
      }
```

**Gemini NER Extraction Prompt rules (enforced):**
- UPPERCASE brand names, no batch/date contamination.
- `invoice_id = "UNKNOWN"` if not present; `"UNREADABLE"` sentinel if image is not a bill.
- Only report what is visible — no hallucination.
- JSON only at root, no markdown fences.

### 5.4 Pipeline 4: CDSCO Regulatory Check (LIVE)

```
check_regulatory_status(canonical_salt_key)
  → 1h TTL in-memory cache refresh from cdsco_regulations MongoDB collection
  → LRU(1024) cache per unique canonical_salt_key
  → Check 1: BANNED_FDC — substring match of banned canonical_salt_key in input
  → Check 2: SCHEDULE_H1 — exact token match of drug_name within canonical_salt_key
  → Default: APPROVED
```

### 5.5 Pipeline 5: Drug-Drug Interaction Check (LIVE — in-memory)

```
check_batch_interactions(canonical_salts: List[str])
  → Flatten + split '|'-delimited composite keys into individual salt tokens
  → normalize: strip, lowercase, remove spaces
  → O(n²) pairwise check via itertools.combinations
  → Bidirectional DDI_MATRIX lookup (a→b, then b→a)
  → Collect InteractionAlert { drug_a, drug_b, severity, description }
  → Sort: HIGH (rank 1) → MODERATE (rank 2) → LOW (rank 3), then alphabetically
  → build_ddi_summary() packages into FinalAuditReport.ddi_summary dict
```

**DDI_MATRIX covers 20+ pairs across 8 categories:**
- Antiplatelets: Clopidogrel + Omeprazole/Esomeprazole/Aspirin
- Anticoagulants: Warfarin + Aspirin/Ibuprofen/Naproxen/Metronidazole/Fluconazole/Amiodarone
- Antibiotics: Ciprofloxacin + Calcium/Theophylline/Tizanidine; Amoxicillin + Methotrexate; Clarithromycin + Atorvastatin/Simvastatin/Carbamazepine
- Statins: Atorvastatin + Gemfibrozil
- Cardiac: Digoxin + Amiodarone/Clarithromycin/Spironolactone
- ACE Inhibitors: Lisinopril + Potassium/Spironolactone
- Diabetes: Metformin + Iodine Contrast/Alcohol
- Antidepressants: Fluoxetine + Tramadol/MAOIs
- Seizure: Phenytoin + Fluconazole/Carbamazepine

---

## 6. API Endpoint Reference

All endpoints are on the FastAPI backend at `http://127.0.0.1:8000`. The Express gateway at `localhost:5000` proxies a subset.

| Method | URL | Proxied by Gateway | Purpose | Status |
|--------|-----|--------------------|---------|--------|
| `GET` | `/` | ✗ | Health check | ✅ Live |
| `GET` | `/api/v1/substitute?brand=<name>` | ✅ | Legacy SHA-256 brand→generic lookup | ✅ Live |
| `GET` | `/api/v1/verify-batch/{batch_number}` | ✅ | CDSCO batch blacklist check | ✅ Live |
| `POST` | `/api/v1/check-interactions` | ✅ | Legacy DDI stub (3 hardcoded rules) | ✅ Live |
| `POST` | `/api/v1/mapping/match` | ✅ | Atlas Search mapping engine | ✅ Live (primary) |
| `POST` | `/api/v1/scanner/upload` | ✗ | Gemini OCR + full audit pipeline | ✅ Live (backend only) |

> **Note:** The frontend `api.js` calls FastAPI **directly** at port 8000 (not via the gateway at 5000). The gateway is available but not used by current frontend code.

---

## 7. Frontend Design System

**Theme:** Galaxy-dark glassmorphism. Deep black/slate background with radial gradient (`from-slate-900 via-[#0a0a0c] to-black`). Translucent glass cards with backdrop blur.

**Key CSS utilities defined in `index.css`:**

| Class | Description |
|-------|-------------|
| `.glass-card` | `bg-slate-900/50 backdrop-blur-xl border border-slate-800/60` |
| `.gm-input` | Dark-themed input with focus ring |
| `.btn-primary` | Gradient emerald CTA button with hover lift |
| `.gradient-text` | `bg-gradient-to-r from-emerald-400 to-teal-300` text |
| `.skeleton` | Animated shimmer loading placeholder |
| `.audit-row` | Hover highlight for table rows |
| `.drop-zone` | Dashed border dropzone with drag-over styling |
| `@keyframes fadeIn` | 0.4s opacity fade |
| `@keyframes slideUp` | 0.4s translate + opacity slide |

**Color palette (Tailwind HSL tokens):**
- Brand accent: Emerald 400/500, Teal 400/600
- GooeyNav particles: Purple/Violet (`#a855f7`, `#d946ef`, `#c084fc`, `#f0abfc`)
- Overcharge signals: Amber 400/500
- Safe/generic signals: Emerald 400/500
- Danger: Red 300/500

**Navigation branding:**
- Route `/` = **MediMatch** (Generic Medicine Finder)
- Route `/auditor` = **BillSense** (Smart Bill Auditor)

---

## 8. Phased Implementation Roadmap

| Phase | Module | Status | Key Deliverables |
|-------|--------|--------|------------------|
| **1–2** | Core Infra & Generic Mapping | ✅ Complete | MongoDB setup, SHA-256 hash engine, FastAPI endpoints, Express gateway, React SPA with multi-page routing, Atlas Search integration, seed data pipeline. |
| **3** | CDSCO Regulatory Compliance | 🟡 Backend Live | `regulatory_service.py` + `seed_cdsco.py` operational. Called inside scanner pipeline. Frontend display of regulatory status per line item is not yet wired. |
| **3b** | OCR/NLP Invoice Scanner | ✅ Backend Complete | Gemini 1.5 Flash Vision pipeline fully implemented. Frontend `BillAuditor.jsx` has complete audit UI but still uses sample data internally — OCR backend endpoint not yet wired to the file upload in the UI. |
| **3c** | DDI Safety Engine | ✅ Production In-Memory | Full DDI matrix with 20+ pairs. Auto-runs on invoice scan. Legacy 3-rule stub still exists in `main.py` (`/api/v1/check-interactions`) but is superseded by `ddi_service.py`. |
| **4** | NPPA/DPCO Price Audit | 🔴 Not Started | DPCO Schedule-I ceiling price indexing; overcharge math against statutory price ceilings (separate from MRP overcharge already implemented). |
| **5** | Advanced DDI (RxNorm/OpenFDA) | 🔴 Not Started | Replace in-memory matrix with live RxNorm/OpenFDA API queries for broader coverage. |
| **6** | End-to-End Polish & Launch | 🔴 Not Started | Unified audit report UI. Load testing (<3s SLA). Medico-legal disclaimer audit. Production deployment. |

---

## 9. What Needs to Happen Next

1. **Wire scanner endpoint to frontend:** `BillAuditor.jsx` file upload currently processes the hardcoded `SAMPLE_CHEMIST_BILL` instead of calling `POST /api/v1/scanner/upload`. The backend endpoint is fully ready — the frontend needs a `fetch` call to it.
2. **Display regulatory status in BillAuditor UI:** The scanner backend returns `regulatory_summary` per line item (APPROVED / BANNED / SCHEDULE_H1), but the frontend table doesn't yet render it.
3. **Display DDI summary in BillAuditor UI:** The `FinalAuditReport.ddi_summary` is returned by the backend but not yet surfaced in the frontend.
4. **Scale seed data:** Run `seed_generic_inventory.py` against the full `janaushadhi_master.csv` (249 KB) to bulk-upsert the complete PMBJP catalog into `Generic_Inventory`.
5. **Verify Atlas Search index:** Confirm the `"default"` Lucene index is active and configured on `Generic_Inventory` in the MongoDB Atlas UI (covers `canonical_salt_key` and `generic_name` fields).
6. **Move API URL to env var:** `frontend/src/api.js` line 2 hardcodes `http://127.0.0.1:8000`. Should use `import.meta.env.VITE_API_URL`.
7. **Rename legacy collections:** `Branded_Drugs` → `genmeds`, `Generic_Inventory` → `janaushadhi_master` (update all references in `main.py`, `seed_db.py`, `mapping.py`).
8. **DDI display in GenericFinder:** Surface DDI warnings when a user searches a salt that has known interactions.

---

## 10. Engineering Guardrails (MANDATORY)

Any AI coding assistant or developer contributing to this repository **MUST** adhere to these rules:

1. **Always use MongoDB Atlas Search** for drug matching. Use `$search` aggregation pipelines. Do NOT implement fallback regex scripts, Levenshtein distance in application code, or probabilistic cosine similarity for matching logic.
2. **Never suggest migrating to SQLite, PostgreSQL, or any SQL database.** The entire search pipeline is built on MongoDB Atlas Search with Lucene indexes.
3. **Never use probabilistic/AI-generated drug substitutions.** The mapping engine must be deterministic (canonical key match or Atlas Search) or explicit FAILSAFE. Zero tolerance for "close enough" matches without a score threshold.
4. **Prioritize engine accuracy over UI polish.** Always validate and optimize core mapping accuracy and database logic before building out frontend features.
5. **Preserve Atlas Search indexes.** Any data migration or seeding script must use upserts (`bulk_write` with `UpdateOne(upsert=True)`), not `drop()` + `insert()`.
6. **Windows development environment.** All commands must work on Windows / PowerShell. Paths use backslashes in the shell but forward slashes in code.
7. **Environment variables stay in `.env` files.** `MONGO_URI`, `DB_NAME`, `GEMINI_API_KEY` are all in `backend/.env`. Never hardcode credentials in source files.
8. **Pydantic v2 syntax.** All models use `model_validate()`, `model_dump()`, and `field_validator`. Do not use v1 syntax (`.parse_obj()`, `.dict()`, `@validator`).

---

## 11. Known Issues & Technical Debt

| Issue | Location | Priority |
|-------|----------|----------|
| BillAuditor file upload ignores actual file, uses sample data | `frontend/src/components/BillAuditor.jsx` L101–102 | HIGH |
| Regulatory + DDI results from scanner not surfaced in UI | `BillAuditor.jsx` | HIGH |
| Frontend API URL is hardcoded | `frontend/src/api.js` line 2 | MEDIUM |
| Collection names don't match target schema | `main.py`, `seed_db.py`, `mapping.py` | MEDIUM |
| Duplicate `/api/v1/mapping/match` endpoint in both `main.py` and `app/routes/mapping.py` | `backend/main.py` L217–304 | MEDIUM |
| Legacy DDI stub in `main.py` superseded by `ddi_service.py` | `main.py` L162–214 | LOW |
| Only 3 branded + 3 generic drugs in seed | `seed_db.py` | LOW (use CSV seeder) |
| `salt_mappings` collection referenced in design but not created | Database | LOW |
| No authentication or rate limiting | Gateway / FastAPI | LOW |

---

## 12. Key Documents Reference

| Document | Path | Purpose |
|----------|------|---------|
| This context file | `docs/status_updates/PROJECT_CONTEXT.md` | AI/developer onboarding anchor |
| August 12 Status | `docs/status_updates/Status(12 aug).md` | Phase 1 baseline + GooeyNav UI polish log |
| August 16 Status | `docs/status_updates/Status(16 aug).md` | Phase 2–3 completion: scanner, DDI, regulatory, BillAuditor UI |
| Software Requirements Specification | `docs/srs/GenMed_SRS_v1.0.md` | Full FR/NFR, sequence diagrams, ERD, schemas |
| Master Implementation Plan (Phases 3–6) | `docs/temp_docs/pharma_implementation_plan.md` | Sprint timeline, CDSCO/OCR/NLP/DDI technical breakdown |
| Project README | `README.md` | Public overview, architecture diagram, feature list |
| Capstone Presentation | `docs/presentation/GenMed_Presentation.pptx` | 12-slide deck for academic submission |
