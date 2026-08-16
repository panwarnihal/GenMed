# GenMed — Status Update: August 16, 2026

> **Period Covered:** August 12 → August 16, 2026  
> **Baseline:** Phase 1 complete (SHA-256 mapping engine, 3-endpoint FastAPI, basic React UI, GooeyNav integration)  
> **Current State:** Phase 2 & 3 backend complete; Phase 3 frontend partially wired

---

## Summary of Changes

Between Aug 12 and Aug 16, the project moved from a basic prototype into a multi-feature healthcare safety platform. The following systems were designed, implemented, and integrated:

1. **MongoDB Atlas Search Mapping Engine** (replaces simple field-index substitute endpoint as the primary path)
2. **Gemini Vision OCR/NER Invoice Scanner** (full backend pipeline: image → structured JSON → audit report)
3. **Drug-Drug Interaction Service** (production-grade in-memory matrix, 20+ pairs, bidirectional, severity-ranked)
4. **CDSCO Regulatory Compliance Service** (MongoDB-backed, TTL cache + LRU, FDC banning + Schedule H1)
5. **Frontend: GenericFinder (MediMatch) full redesign** (Atlas Search integrated, score ring, savings bar, demo presets)
6. **Frontend: BillAuditor (BillSense) full redesign** (multi-item audit UI, overcharge detection, generic savings)
7. **Multi-page SPA routing** (React Router, 4 pages, shared Layout + footer)
8. **Backend modularization** (APIRouters + services, `app/routes/`, `app/services/`)

---

## 1. Backend Changes

### 1.1 Atlas Search Mapping Router — `app/routes/mapping.py` [NEW]

- Created `APIRouter` at `/api/v1/mapping/match` (POST).
- Accepts `{ query: str, extracted_salt: Optional[str] }`.
- Generates `canonical_salt_key` via `utils_hasher.generate_canonical_salt_key()`.
- Runs MongoDB `$search` compound pipeline on `Generic_Inventory`:
  - **Priority 1:** text match on `canonical_salt_key` field (5x relevance boost).
  - **Priority 2:** fuzzy match on `generic_name` (maxEdits=1, prefixLength=3 — handles OCR typos).
- Returns `{ match_found: bool, top_alternative: { drug_code, generic_name, jan_aushadhi_price, search_score } }`.
- **Graceful fallback:** if Atlas Search index is still compiling, falls back to regex `find()` on `canonical_salt_key`.
- Pydantic v2 response models: `MappingRequest`, `MappingResponse`, `AlternativeDetail`.

### 1.2 Gemini Vision OCR Scanner Router — `app/routes/scanner.py` [NEW]

- Created `APIRouter` at `/api/v1/scanner/upload` (POST, multipart).
- **MIME type guard:** allows JPG, PNG, WEBP, BMP, GIF. Normalizes `image/jpg → image/jpeg`. Rejects others with 400.
- **10 MB size cap** (Gemini inline limit is 20 MB; we cap at 10 MB for safety).
- **Gemini 1.5 Flash** Vision call with a deterministic extraction prompt (temperature=0.1, response JSON mode):
  - Extracts `invoice_id`, `chemist_name`, and a list of `line_items` from pharmacy bill images.
  - Each `ExtractedLineItem`: `brand_name` (UPPERCASE), `extracted_salt`, `quantity_units`, `batch_number`, `printed_mrp`, `paid_price`, `dpco_ceiling_price`.
  - Strict rules enforced in prompt: no hallucination, `"UNREADABLE"` sentinel for bad images.
- **`_extract_json_block()`**: defensive parser that strips markdown fences and finds outermost JSON braces.
- Pydantic v2 validation of Gemini output → `InvoiceScanResult`.
- Per line-item processing loop:
  - Calls `match_generic_alternative()` (async) to find Jan Aushadhi alternative.
  - Calculates MRP overcharge (`paid_price > printed_mrp × qty`).
  - Calculates generic savings (`paid_price - (JA_price × qty)`).
  - Calls `check_regulatory_status(canonical_salt_key)` for CDSCO compliance badge.
- Accumulates all canonical salts for **batch DDI check** at the end via `check_batch_interactions()`.
- Returns `FinalAuditReport` with: `invoice_id`, `total_paid`, `total_overcharge`, `total_potential_savings`, `audited_items[]`, `ddi_summary`.
- Logging at each stage: image size, Gemini call params, line item count, DDI alert count.

### 1.3 DDI Service — `app/services/ddi_service.py` [NEW]

Replaced the 3-rule stub in `main.py` with a comprehensive, production-grade in-memory service:

- **`DDI_MATRIX`**: bidirectional dictionary covering **20+ clinically documented drug pairs** across 8 categories:

  | Category | Key Pairs |
  |----------|-----------|
  | Antiplatelets | Clopidogrel + Omeprazole (HIGH), Clopidogrel + Esomeprazole (HIGH), Clopidogrel + Aspirin (MODERATE) |
  | Anticoagulants | Warfarin + Aspirin/Ibuprofen/Naproxen/Metronidazole/Fluconazole/Amiodarone (all HIGH) |
  | Antibiotics | Ciprofloxacin + Theophylline/Tizanidine (HIGH), Amoxicillin + Methotrexate (HIGH), Clarithromycin + Atorvastatin/Simvastatin/Carbamazepine (HIGH) |
  | Statins | Atorvastatin + Gemfibrozil (HIGH) |
  | Cardiac | Digoxin + Amiodarone/Clarithromycin (HIGH), Digoxin + Spironolactone (MODERATE) |
  | ACE Inhibitors | Lisinopril + Potassium/Spironolactone (MODERATE) |
  | Diabetes | Metformin + Iodine Contrast (HIGH), Metformin + Alcohol (MODERATE) |
  | Antidepressants | Fluoxetine + Tramadol/MAOIs (HIGH) |
  | Seizure | Phenytoin + Fluconazole (HIGH), Phenytoin + Carbamazepine (MODERATE) |

- **`check_batch_interactions(canonical_salts)`**: flattens `|`-delimited composite keys into individual tokens, runs pairwise O(n²) check via `itertools.combinations`, deduplication via `frozenset`, sorts results HIGH→MODERATE→LOW.
- **`build_ddi_summary(alerts)`**: packages into `{ interaction_count, has_critical_interactions, severity_breakdown, alerts[] }`.
- Graceful handling of unknown severity values (defaults to MODERATE + logs warning).
- Structured logging at every decision point.

### 1.4 CDSCO Regulatory Service — `app/services/regulatory_service.py` [NEW]

- **1h TTL in-memory cache** for the master ruleset (refreshes from MongoDB every hour).
- **`@lru_cache(maxsize=1024)`** on `check_regulatory_status()` — identical salt keys never re-query MongoDB.
- Checks (in order):
  1. **Banned FDC:** substring match of `banned_salt_key` within the incoming `canonical_salt_key`.
  2. **Schedule H1:** exact token match of `drug_name` within the canonical key's `|`-split components.
  3. Default: `APPROVED`.
- Returns `{ status, is_banned, warning_message }`.

### 1.5 CDSCO Seed Script — `backend/seed_cdsco.py` [NEW]

Seeds the `cdsco_regulations` MongoDB collection (upsert-safe, never drops existing data):
- **6 banned FDCs** (e.g., `nimesulide|pioglitazone`, `chlorpheniramine|paracetamol|phenylephrine`, `amoxicillin|dicloxacillin`, etc.).
- **7 Schedule H1 drugs** (moxifloxacin, cefixime, tramadol, alprazolam, ketamine, buprenorphine, pentazocine).
- Creates indexes on `rule_type`, `canonical_salt_key`, `drug_name`.

### 1.6 Generic Inventory Bulk Seeder — `backend/seed_generic_inventory.py` [NEW]

- Reads `data/raw/janaushadhi_master.csv` (249 KB PMBJP product catalog) using Pandas.
- For each row: extracts `drug_code`, `generic_name`, `unit_size`, `MRP`, computes `canonical_salt_key`.
- Bulk-upserts into `Generic_Inventory` using `UpdateOne(upsert=True)` — preserves Atlas Search indexes.

### 1.7 `utils_hasher.py` — Extended [MODIFIED]

Added `generate_canonical_salt_key(text: str)` function:
- Strips pharmacopeial noise words (`IP`, `BP`, `USP`, `trihydrate`, `hydrochloride`, `SR`, `ER`, `acid`, `tablet`, etc.).
- Normalizes Indian Pharmacopeia spelling variants (`amoxycillin → amoxicillin`, `clavulanic → clavulanate`, `acetaminophen → paracetamol`).
- Normalizes unit spacing (`500 mg → 500mg`).
- Tokenizes on `+` / `and`, strips non-alphanumeric, alphabetically sorts, joins with `|`.

### 1.8 `requirements.txt` — Updated [MODIFIED]

Added:
- `google-genai >= 0.3.0` (Gemini Vision SDK)
- `python-multipart >= 0.0.9` (required by FastAPI for `UploadFile`)
- `pandas >= 2.2.0` (used by `seed_generic_inventory.py`)
- `requests >= 2.32.0` (used by `test_invoice_scanner.py`)

### 1.9 `main.py` — Updated [MODIFIED]

- Added `from app.routes import mapping, scanner` and `app.include_router()` calls.
- Added `MappingMatchRequest` Pydantic model + `/api/v1/mapping/match` endpoint (this is a duplicate of the router version — both exist currently; the router version should be the canonical one).
- Legacy stub endpoints (`/api/v1/substitute`, `/api/v1/verify-batch`, `/api/v1/check-interactions`) remain intact.

### 1.10 Gateway — `gateway/server.js` — Updated [MODIFIED]

Added new proxy route:
```js
POST /api/v1/mapping/match  →  FastAPI POST /api/v1/mapping/match
```
Gateway now proxies 4 routes total.

---

## 2. Frontend Changes

### 2.1 `src/api.js` — Rewritten [MODIFIED]

- Replaced the old `axios` + `localhost:5000/api/v1/substitute` call with native `fetch`.
- **Base URL changed:** now calls FastAPI **directly** at `http://127.0.0.1:8000` (bypasses gateway).
- **New primary function:** `matchGenericAlternative(query, extractedSalt)` → `POST /api/v1/mapping/match`.
- Added `checkHealth()` → `GET /` for backend online status polling.
- Both `GenericFinder` and `BillAuditor` import from this centralized module.

### 2.2 Multi-Page SPA Routing — `src/App.jsx` [MODIFIED]

- Migrated to `react-router-dom` `BrowserRouter` with 4 routes.
- Added `ScrollToTop` component that resets scroll on route change.
- Added shared `Layout` component (Navbar + main content area + footer).
- Backend health check polls every **15 seconds** using `setInterval`.
- Footer shows API base URL and PMBJP attribution.

### 2.3 Navbar — `src/components/Navbar.jsx` [MODIFIED]

- 4 navigation items: `MediMatch (/)`, `BillSense (/auditor)`, `About Us`, `Contact`.
- Desktop: GooeyNav with `initialActiveIndex` derived from `useLocation().pathname`.
- Mobile: slide-down menu with `NavLink` + `useLocation`-based active state.
- Scroll-aware: adds `shadow-xl` when scrolled past 10px.
- Removed "Leave a Review" button and "Backend Online" indicator from previous version.

### 2.4 GenericFinder — `src/components/GenericFinder.jsx` [FULLY REBUILT]

Complete redesign of the main search page:

**Layout:** 12-column CSS grid. Left (5 cols): search form. Right (7 cols): results / how-it-works.

**Left column:**
- Glass-card title block with emerald gradient icon.
- Search form with 3 fields: Brand Name (required), Chemical Salt (optional), Billed Price (optional).
- 4 demo preset pills: Augmentin 625 Duo Tab, Brilinta 90mg, Lipitor 10mg, **Crocin Advance 500mg** (new).

**Right column — result states:**
- `LoadingSkeleton`: animated shimmer placeholder (2 cards + 1 banner).
- `ResultCard` when `match_found: true`:
  - Split brand vs. Jan Aushadhi comparison cards with coloured left-border accent.
  - **`ScoreRing`** SVG: animated circle showing Atlas Search relevance score (max 20), colour-coded High/Medium/Low.
  - **`SavingsBar`**: gradient horizontal bar showing savings percentage.
  - Shows JA drug code + score chips + "Govt. Verified" badge.
  - Handles "no price entered" case separately.
- `NoMatchCard` when `match_found: false`: amber warning card.
- Initial state: "How it works" 4-step grid (shown before any search).

### 2.5 BillAuditor — `src/components/BillAuditor.jsx` [FULLY REBUILT]

Complete redesign of the bill auditor page (renamed to "BillSense" in nav):

**Hero section:** glassmorphic header with 4 feature chips (MRP Overcharge Detection, AI Generic Matching, Itemized Savings Report, PMBJP Verified Data).

**Upload zone (2-column grid):**
- Left (2/3): drag-and-drop zone with `onDragOver`/`onDragLeave`/`onDrop` handlers. Currently triggers sample bill processing.
- Right (1/3): "Quick Test" card showing 4 sample items with a "Load Sample Bill" button.

**Processing:**
- `processAudit()` runs `matchGenericAlternative()` in parallel for all line items (`Promise.all`).
- Per-item: calculates overcharge (paid > MRP×qty) and generic savings (paid - JA_price×qty).
- Progress percentage `[0–100]` displayed during processing.

**Results (4 sub-sections):**
1. **File header:** filename + "X line items scanned / Y generics matched".
2. **3 MetricCards:** Total Billed Amount, Illegal Overcharges Detected (amber if >0, green if 0), Potential Generic Savings.
3. **Savings visual bar:** stacked horizontal bar showing overcharge portion (amber) + generic savings (green) + remainder.
4. **Itemized audit table:** 7 columns: Medicine + salt, Qty, Paid, MRP, Overcharge badge (⚠️/OK), Jan Aushadhi Alt + drug code + unit price, Saves column.

**Utility sub-components:**
- `DonutRing`: animated SVG donut chart for metric visualizations.
- `MetricCard`: reusable stat card with icon, label, value, sub-label.

---

## 3. Data

### 3.1 `data/raw/janaushadhi_master.csv` [NEW]

Added the PMBJP Jan Aushadhi master product catalog CSV (249 KB) to `data/raw/`. This is the source data for `seed_generic_inventory.py`. Contains columns: `Drug Code`, `Generic Name`, `Unit Size`, `MRP`. The bulk seeder reads this and upserts into `Generic_Inventory`.

---

## 4. What Was NOT Done (Remaining Work)

| Item | Priority | Notes |
|------|----------|-------|
| Wire `BillAuditor.jsx` file upload to `POST /api/v1/scanner/upload` | HIGH | Backend endpoint is ready; frontend uploads currently process `SAMPLE_CHEMIST_BILL` only |
| Display `regulatory_summary` per line item in BillAuditor table | HIGH | Backend returns it in `FinalAuditReport`; frontend table has no column for it |
| Display `ddi_summary` in BillAuditor results | HIGH | Backend returns full DDI report; frontend doesn't render it |
| Run `seed_generic_inventory.py` to bulk-import CSV catalog | MEDIUM | Script + CSV exist; execution pending |
| Confirm Atlas Search index is active in MongoDB UI | MEDIUM | Index must be created in Atlas dashboard |
| Move API base URL to `VITE_API_URL` env var | MEDIUM | Currently hardcoded in `api.js` |
| Rename collections to canonical names | MEDIUM | `Branded_Drugs` → `genmeds`, `Generic_Inventory` → `janaushadhi_master` |
| Remove duplicate `/api/v1/mapping/match` from `main.py` | LOW | Router version in `mapping.py` is the canonical one |
| Replace legacy 3-rule DDI stub with `ddi_service.py` call | LOW | Old stub in `main.py` still exists |
| Surface DDI alerts in `GenericFinder` single-drug search | LOW | Would require salt expansion logic |

---

## 5. Architecture Snapshot (Aug 16)

```
[User Browser :5173]
    │
    ├── GET /api/v1/mapping/match ──────────► [FastAPI :8000]
    │       (via fetch, api.js)                    │
    │                                              ├── generate_canonical_salt_key()
    │                                              ├── MongoDB $search → Generic_Inventory
    │                                              └── Returns { match_found, top_alternative }
    │
    ├── GET /                    ──────────► [FastAPI :8000]  (health check)
    │
    └── (upload not yet wired)
            │
            ▼ (when wired) POST /api/v1/scanner/upload
                                 [FastAPI :8000]
                                      │
                                      ├── Gemini 1.5 Flash Vision (OCR + NER)
                                      ├── Pydantic validation
                                      ├── Per line-item: match_generic_alternative()
                                      ├── Per line-item: check_regulatory_status()
                                      └── Batch: check_batch_interactions() → DDI report

[Express Gateway :5000]  ← Still running, proxies 4 routes, but frontend bypasses it
```
