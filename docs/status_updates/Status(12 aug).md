# GenMed - Current Project Status

This document provides a high-level summary of the GenMed project's current state, including recent updates, UI refinements, and Git history. It is designed to quickly onboard any human developer or AI assistant.

---

## 1. Project Overview & Architecture
GenMed is a decoupled full-stack platform for deterministic generic medicine mapping in India. 
- **Backend:** Python / FastAPI (Handles hashing, db queries, regulatory checks).
- **Gateway:** Node.js / Express (Proxies requests to the backend).
- **Frontend:** React 19 + Vite (Client application).
- **Database:** MongoDB Atlas (Currently seeded with a small set of branded and generic drugs).

## 2. Backend & Core Engine (Phase 1 & 2)
- **Deterministic Hashing:** Implemented `utils_hasher.py` to generate SHA-256 hashes of canonical salt strings. This ensures 100% exact-match accuracy when substituting branded drugs for generics.
- **API Endpoints (Working):**
  - `/api/v1/substitute?brand=<name>`: Maps branded to generic and calculates savings.
  - `/api/v1/verify-batch/<batch_number>`: Basic CDSCO batch blacklist check.
  - `/api/v1/check-interactions`: DDI salt interaction check (currently uses a hardcoded stub/rule base).
- **Data Seed:** MongoDB is currently seeded with a minimal testing dataset (3 branded drugs, 3 generic drugs, 2 blacklisted batches) via `seed_db.py`. 

## 3. Frontend & Recent UI Enhancements
The React frontend has recently undergone several aesthetic and layout improvements to create a modern, premium, and "glassy" user experience.

### Navigation (`Navbar.jsx` & `GooeyNav`)
- **Integrated GooeyNav:** Replaced the standard desktop navigation links with the `GooeyNav` component from React Bits.
- **Routing Integration:** Wired `GooeyNav` to React Router's `useNavigate` and `useLocation` to ensure smooth SPA transitions and correct active state on direct URL hits.
- **Custom Aesthetic:** 
  - Changed the gooey particle effect to a vivid **purple/violet palette** (`#a855f7`, `#d946ef`, `#c084fc`, `#f0abfc`) that matches the GenMed gradient text branding.
  - Changed the active highlight shape from a rounded pill to a sharper, boxy shape (`3px` border-radius).
  - Fixed a double-highlight bug by removing the solid CSS `::after` pseudo-element, leaving only the gooey filter effect.
- **Cleaned Up Navbar:** Removed unused elements ("Leave a Review" button, "Backend Online" indicator) to streamline the header. The mobile slide-down menu remains intact.

### Component Polish
- **`GenericFinder.jsx`:** Separated the hero section ("Generic Medicine Finder") into two distinct, translucent glass boxes (one for the header/description, one for the "How it works" steps) with appropriate spacing.
- **`AboutUs.jsx`:** Removed the "90% Avg. Cost Savings" stat box. Re-configured the stats grid from 4 columns to a balanced 3-column layout, applying the same enhanced translucent glassy styling (`bg-slate-900/40 backdrop-blur-md`).

## 4. Recent Git History & Progress
A look at the recent commit history reveals the trajectory of the recent frontend overhaul:
- `gooey nav for website`: Integrated React Bits GooeyNav component into the Navbar.
- `improved about us`: Removed the savings claim and implemented translucent grid styling.
- `front page improvements` & `navbar improvements`: General UI cleanup and layout adjustments.
- `Galaxy design with transparent modals for my project`: Major visual overhaul establishing the "glassy/translucent" dark theme and galaxy-inspired aesthetics.
- `convert app to multi-page routing with react-router-dom`: Migrated the application from a single-page scrolling layout to a multi-page SPA architecture.
- `overhaul Smart Bill Auditor page` & `overhaul Generic Medicine Finder page`: Significant redesigns of the core application feature pages.

## 5. Next Steps & Technical Debt
*(Refer to `PROJECT_CONTEXT.md` for full details)*
- **Data Scaling:** Migrate from the 3-drug seed data to the full ~2,500 Jan Aushadhi catalog. 
- **Atlas Search:** Implement MongoDB Atlas Search indexes for typo-tolerant matching (currently using exact field indexes).
- **Search UI:** Upgrade the free-text search input in the frontend to a constrained autocomplete dropdown as per the SRS.
- **DDI Engine:** Replace the 3 hardcoded drug-drug interaction rules with actual RxNorm/OpenFDA matrix queries.
- **Phase 3+ Features:** Begin work on CDSCO Regulatory Compliance, OCR/NLP Invoice Scanner, and NPPA Price Auditing.
