# SOFTWARE REQUIREMENT SPECIFICATION (SRS)
## GenMed: Deterministic Generic Medicine Mapping & Healthcare Safety Platform
**Document Version:** 1.0  
**Author:** Nihal Panwar (4MCA - Christ University)  
**Alignment:** UN SDG 3 (Good Health & Well-being) & SDG 9 (Industry, Innovation & Infrastructure)  

---

## 1. INTRODUCTION

### 1.1 Purpose
This document specifies the software requirements for **GenMed**, an algorithmic healthcare informatics platform and microservices engine. The platform addresses the massive out-of-pocket pharmaceutical burden in India by providing deterministic mapping of branded prescriptions to subsidized generic equivalents via the Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP) network, while enforcing multi-layered clinical safety, drug-drug interaction validation, OSINT counterfeit detection, and geospatial pharmacy routing.

### 1.2 Document Conventions
- **API:** Active Pharmaceutical Ingredient
- **PMBJP:** Pradhan Mantri Bhartiya Janaushadhi Pariyojana
- **CDSCO:** Central Drugs Standard Control Organisation
- **NER:** Named Entity Recognition
- **OSINT:** Open Source Intelligence

### 1.3 Intended Audience
This specification is intended for systems architects, full-stack developers, database administrators, and academic evaluation panels.

---

## 2. ARCHITECTURAL OVERVIEW & SYSTEM CONTEXT

GenMed operates on a decoupled microservices architecture:
1. **Client Layer (React.js / Vite):** Highly responsive UI featuring strict autocomplete constraints, dynamic savings gauges, side-effect trust cards, and interactive map rendering.
2. **Gateway Layer (Node.js / Express):** Manages user authentication, request rate-limiting, and routes traffic between the client and downstream services.
3. **Computational & Safety Service (Python / FastAPI):** Executes NLP-NER parsing, SHA-256 chemical salt hashing, contraindication matrix cross-referencing, CDSCO blacklist lookups, and price anomaly math.
4. **Data Cluster (MongoDB Enterprise/Atlas):** Houses indexed collections for Branded Drugs, PMBJP Generic Inventories, CDSCO Blacklisted Batches, and Geospatial Kendra locations.