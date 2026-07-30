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