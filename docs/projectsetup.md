# GenMed Project Setup Guide

This guide provides instructions for setting up the GenMed project on your local machine for development and testing.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **Python 3.10+** (for the FastAPI Backend)
- **Node.js 18+** & **npm 9+** (for Gateway and Frontend)
- **MongoDB Atlas** account (or local MongoDB)
- **Docker & Docker Compose** (Optional, for containerized setup)

---

## 1. Environment Configuration

### Backend Environment Variables
Create a `.env` file inside the `backend` directory:
```bash
# d:\GenMed\backend\.env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
DB_NAME=genmed_db
```
*(Replace `<user>`, `<password>`, and `<cluster>` with your MongoDB credentials.)*

### Gateway Environment Variables
The gateway `.env` file should already be configured, but ensure it contains:
```bash
# d:\GenMed\gateway\.env
PORT=5000
FASTAPI_BASE_URL=http://127.0.0.1:8000
```

---

## 2. Local Setup (Without Docker)

### Install Dependencies

**Backend:**
```bash
cd backend
python -m venv venv
# Activate the virtual environment
venv\Scripts\activate   # For Windows
source venv/bin/activate # For Mac/Linux

pip install -r requirements.txt
```

**Gateway:**
```bash
cd ../gateway
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### Running the Services

**Option A: One-Command Launch (Windows Recommended)**
From the project root, simply double-click `start-all.bat` or run:
```powershell
.\start-all.ps1
```
*(Note: If PowerShell blocks the script, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`)*

**Option B: Manual Launch**
Open three separate terminals from the project root:

1. **Backend:**
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```
2. **Gateway:**
```bash
cd gateway
npm run dev
```
3. **Frontend:**
```bash
cd frontend
npm run dev
```

---

## 3. Docker Setup (Alternative)

If you prefer using Docker to run the entire stack (MongoDB, Backend, Frontend/Gateway):

1. Ensure Docker Desktop is running.
2. From the root directory (`d:\GenMed`), run:
```bash
docker-compose up --build
```
This will start MongoDB, the FastAPI backend, and the Node frontend/gateway on the `genmed_network`.

---

## 4. Verifying the Installation

Once the services are running, you can access them at the following URLs:

- **Frontend UI:** http://localhost:5173 (or http://localhost:5000 if running via Docker)
- **Backend API (Swagger Docs):** http://localhost:8000/docs
- **Backend Health Check:** http://localhost:8000/
- **Gateway:** http://localhost:5000

## Troubleshooting
- **Port Conflicts:** Ensure ports 8000, 5000, and 5173 (or 27017 for local MongoDB) are not being used by other applications.
- **MongoDB Connection:** Double-check your network access rules in MongoDB Atlas to ensure your current IP address is whitelisted.
