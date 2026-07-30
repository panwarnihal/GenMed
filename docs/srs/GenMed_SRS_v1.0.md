# CAPSTONE PROJECT C1 SUBMISSION REPORT
# SOFTWARE REQUIREMENT SPECIFICATION (SRS) & SYSTEM DESIGN
**Project Title:** GenMed: A Deterministic Exact-Match Generic Medicine Mapping & Healthcare Safety Platform  
**Student Name:** Nihal Panwar  
**Class / Register No:** 4MCA  
**Institution:** Christ University  
**Alignment:** UN SDG 3 (Good Health and Well-being) & UN SDG 9 (Industry, Innovation, and Infrastructure)  

---

## SECTION 1: PROJECT SYNOPSIS & SDG ALIGNMENT

### 1.1 Abstract & Project Objectives
GenMed is an advanced healthcare informatics platform designed to bridge the severe information asymmetry and cost barrier in Indian pharmaceuticals. While government-subsidized generic equivalents exist via the Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP) network, patients routinely pay exorbitant prices for branded monopolies due to complex medical jargon and fragmented data. 

**Core Objectives:**
1. **Deterministic Generic Mapping:** Replace error-prone probabilistic AI search with a strict, rule-based hash-matching engine that maps branded prescriptions to verified Active Pharmaceutical Ingredients (APIs).
2. **Clinical Safety & Interoperability:** Integrate real-time drug-drug interaction detection and equivalence-trust profiling.
3. **Consumer-Level Fraud Prevention:** Implement automated price-anomaly heuristics and OSINT-driven CDSCO batch blacklist verification to flag suspicious or recalled drugs.
4. **Last-Mile Accessibility:** Provide dynamic geospatial indexing to route patients to the nearest physical Jan Aushadhi Kendra.

### 1.2 Alignment with UN Sustainable Development Goals (SDGs)
* **SDG 3: Good Health and Well-being:** Directly democratizes access to essential, high-quality generic medicines, alleviating the crushing financial burden of chronic and acute care treatments.
* **SDG 9: Industry, Innovation, and Infrastructure:** Introduces a scalable, microservices-driven technical architecture that transforms static government datasets into an active, intelligent health-tech utility.

---

## SECTION 2: ANALYSIS PHASE (EXISTING SYSTEM & LIMITATIONS)

### 2.1 Existing Systems & Current Market Landscape
Current retail pharmacy apps and commercial discovery tools rely on **Probabilistic Matching** (e.g., Cosine Similarity, Vector Embeddings, or fuzzy text search) to recommend alternatives. 

### 2.2 Critical Limitations of Current Systems
1. **The Hallucination Liability:** Probabilistic AI models can misinterpret textual similarities, leading to incorrect drug substitutions. In healthcare, an 82% "guess" is a critical clinical hazard.
2. **Lack of Interaction Oversight:** Existing search platforms focus solely on brand-to-brand cost comparison without verifying whether stacking certain generic alternatives triggers adverse drug-drug interactions.
3. **Absence of Regulatory Safety Nets:** Consumers have no automated mechanism to cross-reference whether a purchased or prescribed medicine batch belongs to a government-recalled or substandard (spurious) manufacturing batch.
4. **Financial Exploitation:** Fragmented pricing data leaves patients vulnerable to market dumping and artificial price markups by local vendors.

---

## SECTION 3: PROPOSED SYSTEM ARCHITECTURE & DATA FLOW

GenMed solves these challenges by moving away from guesswork and enforcing **absolute mathematical certainty** through a decoupled microservices model.

* **Client Layer (React.js / Vite):** Highly responsive UI featuring strict autocomplete constraints, dynamic savings gauges, side-effect trust cards, and interactive map rendering.
* **Gateway Layer (Node.js / Express):** Manages user authentication, request rate-limiting, and routes traffic between the client and downstream services.
* **Computational & Safety Service (Python / FastAPI):** Executes NLP-NER parsing, SHA-256 chemical salt hashing, contraindication matrix cross-referencing, CDSCO blacklist lookups, and price anomaly math.
* **Data Cluster (MongoDB Enterprise/Atlas):** Houses indexed collections for Branded Drugs, PMBJP Generic Inventories, CDSCO Blacklisted Batches, and Geospatial Kendra locations.

### 3.1 System Data Flow Diagram

```text
[React.js Client] 
       │ 
       │ (REST / JSON)
       ▼
[Node.js / Express API Gateway] ──(CRUD / Spatial Queries)──► [MongoDB Atlas Cluster]
       │
       │ (RPC / JSON Payload)
       ▼
[Python / FastAPI Computational Backend]
  (NER Parsing | SHA-256 Hashing | OpenFDA Matrix | CDSCO OSINT)
```

---

## SECTION 4: FUNCTIONAL REQUIREMENTS (FR)

* **FR-1: Autocomplete Query Input:** The UI must enforce search input via a dropdown populated by indexed MongoDB text fields to eliminate syntax errors, typos, and open-domain text variations.
* **FR-2: NLP-NER Parameter Extraction:** The FastAPI service must parse incoming text strings into structured tuples: `[Brand_Name, Active_Salt, Strength, Dosage_Form]`.
* **FR-3: Deterministic Salt-Hash Substitution:** The engine must normalize the chemical salt string (lowercase, alphabetically ordered) and compute a SHA-256 cryptographic hash. Substitution lookup must execute an exact-match query against the PMBJP catalog's `salt_composition_hash`.
* **FR-4: Zero-Risk Clinical Failsafe:** If an exact SHA-256 hash match is missing, the system must fail securely. It shall not fall back on probabilistic similarity (e.g., Cosine Similarity/LLM guessing) and must return an explicit clinical warning payload.
* **FR-5: Dynamic Financial Calculation:** The backend must compute exact rupee and percentage savings:
  $$\text{Savings (\%)} = \left( \frac{\text{Branded MRP} - \text{Generic Price}}{\text{Branded MRP}} \right) \times 100$$
* **FR-6: Side-Effect & "Equivalency Trust" Profiling:** The platform must dynamically display side-effect data bound to the SHA-256 salt hash, visually proving identical safety profiles between the branded drug and generic alternative.
* **FR-7: Multi-Drug Contraindication Validation:** The system must accept >= 2 active medications simultaneously and cross-reference their salts against clinical contraindication matrices (OpenFDA/Kaggle datasets) to output severity-ranked drug-drug interaction alerts.
* **FR-8: CDSCO Regulatory Batch Verification:** Users must be able to submit a 5–10 character alphanumeric Batch Number. The system queries the `Blacklisted_Batches` collection for known "Not of Standard Quality" (NSQ) or Spurious recalls published by the CDSCO.
* **FR-9: Statistical Price-Anomaly Heuristic:** Users can log their purchase price. If $\text{Purchase\_Price} < (\text{Official\_MRP} \times 0.40)$, the system triggers an automated alert for suspected market dumping or counterfeit distribution.
* **FR-10: Last-Mile Kendra Geospatial Locator:** Using GPS coordinates, the Node.js gateway must execute a MongoDB `$near` query on a `2dsphere` index to return the 3 nearest verified Jan Aushadhi pharmacies.
* **FR-11: Epidemiological Surveillance Heatmap (Admin Scope):** The system must aggregate search queries by chemical salt and region over 48-hour windows using MongoDB Aggregation Pipelines to detect localized public health spikes.

---

## SECTION 5: NON-FUNCTIONAL REQUIREMENTS (NFR)

* **NFR-1: Clinical Accuracy (0% False-Positive Rate):** The substitution engine must achieve a 100% exact-match rate on chemical composition hashes. Probabilistic approximations are strictly disallowed.
* **NFR-2: Performance & Latency:** End-to-end mapping requests (NER extraction -> SHA-256 hashing -> MongoDB query -> JSON return) must execute in < 500ms under standard load.
* **NFR-3: High Availability & Horizontal Scalability:** Microservices must be stateless and dockerizable, allowing horizontal pod scaling during high-traffic epidemiological events.
* **NFR-4: Data Protection & Transit Security:** All REST and internal RPC communications must be encrypted via TLS 1.3. User location and medical queries must be logged without personally identifiable information (PII).

---

## SECTION 6: SYSTEM DESIGN & DATABASE SCHEMA (MONGODB)

### 6.1 User Interface (UI) Wireframe Description
* **Search View:** Centered clean input bar with strict autocomplete dropdowns to eliminate query syntax errors.
* **Comparison Dashboard:** Split-screen layout contrasting the Branded Product (Red Theme, High Price) against the Equivalent Generic (Green Theme, Subsidized Price) alongside a prominent Savings Gauge.
* **Safety Panel:** Expandable modular cards displaying Side-Effect Profiles (Equivalency Trust), Drug-Drug Interaction Warnings, and CDSCO Batch Statuses.

### 6.2 MongoDB Schema Specification

#### Branded_Drugs Collection
```json
{
  "_id": "ObjectID",
  "brand_name": "String (Indexed)",
  "manufacturer": "String",
  "active_ingredients": [
    { "salt": "String", "strength": "String" }
  ],
  "salt_composition_hash": "String (SHA-256)",
  "mrp_price": "Decimal"
}
```

#### Generic_Inventory Collection (PMBJP Catalog)
```json
{
  "_id": "ObjectID",
  "drug_code": "String",
  "generic_name": "String",
  "active_ingredients": [
    { "salt": "String", "strength": "String" }
  ],
  "salt_composition_hash": "String (Strict Unique Index)",
  "jan_aushadhi_price": "Decimal",
  "unit_size": "String"
}
```

#### Blacklisted_Batches Collection (CDSCO OSINT)
```json
{
  "_id": "ObjectID",
  "drug_name": "String",
  "batch_number": "String (Indexed)",
  "manufacturer_on_label": "String",
  "reason_for_recall": "String",
  "alert_month": "String"
}
```

#### Janaushadhi_Stores Collection (Geospatial)
```json
{
  "_id": "ObjectID",
  "store_id": "String",
  "address": "String",
  "location": {
    "type": "Point",
    "coordinates": ["Longitude", "Latitude"]
  }
}
```

### 6.3 Algorithmic Logic Narrative
1. **Input Stage:** User inputs brand name via autocomplete.
2. **Extraction Stage:** FastAPI microservice parses input into strict `[Brand, Dosage, Salt]` parameters.
3. **Hashing & Validation:** Generates a cryptographic hash string from the exact chemical salt composition (lowercase, alphabetical order).
4. **Execution Branch:**
   * **Branch A (Equivalency):** Queries `Generic_Inventory` via `salt_composition_hash`. Returns exact match and calculates financial savings.
   * **Branch B (Safety Check):** Evaluates inputs against the `Blacklisted_Batches` collection and checks contraindication matrices.
5. **Output Stage:** JSON payload returned to React frontend for real-time visual rendering.

---

## SECTION 7: EXPECTED OUTCOMES & SPECIALIZATION CONCEPTS

### 7.1 Expected Outcomes
* Delivery of a fully responsive, secure web platform capable of slashing patient drug expenditure by up to 90%.
* Zero-risk clinical substitution via strict hash-based matching.
* Enhanced consumer protection through automated OSINT fraud and safety checks.

### 7.2 Specialization Concepts Used
* **Natural Language Processing (NLP):** Named Entity Recognition (NER) for parsing unstructured medical inputs.
* **Data Science & Cryptography:** Salt-composition string normalization and cryptographic hashing.
* **Full-Stack Microservices Architecture:** Decoupled Node.js gateway communicating with a Python/FastAPI computational backend.
* **Advanced Database Engineering:** MongoDB indexing, spatial `2dsphere` querying, and aggregation pipelines.

---

## SECTION 8: PRESENTATION SLIDE OUTLINE (12 SLIDES)

* **Slide 1:** Title Slide (Project Name, Student Details, Institutional Affiliation)
* **Slide 2:** Introduction & Real-World Impact (The Ticagrelor / Brilinta Case Study)
* **Slide 3:** Problem Statement & SDG Alignment (SDG 3 & SDG 9)
* **Slide 4:** Market Analysis & The Cost Problem (60% Out-of-Pocket Burden Data - NHA / NITI Aayog citations)
* **Slide 5:** Limitations of Existing Systems (Probabilistic vs. Deterministic Approaches)
* **Slide 6:** Proposed System Architecture (Microservices: React, Node.js, FastAPI, MongoDB)
* **Slide 7:** Core Innovation: Deterministic Exact-Match Engine (Flowchart & Hashing Logic)
* **Slide 8:** Advanced Safety Modules: CDSCO Blacklist & Price Anomaly Heuristics
* **Slide 9:** Clinical Safety: Drug-Drug Interaction & Equivalency Trust Profiling
* **Slide 10:** UI/UX Dashboard Prototype (Search, Split-Screen Comparison, Geospatial Locator)
* **Slide 11:** Expected Outcomes & Real-World Cost Reductions
* **Slide 12:** Conclusion & Future Roadmap

---

## SECTION 9: GITHUB REPOSITORY LINK

Project Repository: [https://github.com/panwarnihal/GenMed](https://github.com/panwarnihal/GenMed)