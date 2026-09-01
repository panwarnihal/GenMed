@echo off
title GenMed - Starting All Services

echo ==========================================
echo   GenMed - Launching All Services
echo ==========================================
echo.

REM --- Create local MongoDB data directory if missing ---
if not exist data\db mkdir data\db 2>nul

REM --- Start MongoDB Local Service ---
echo [1/4] Starting Local MongoDB Service...
start "GenMed MongoDB" cmd /k "mongod --dbpath data\db"

REM --- Start Backend (FastAPI) ---
echo [2/4] Starting Backend (FastAPI)...
start "GenMed Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && uvicorn main:app --reload --port 8000"

REM --- Start Gateway (Node/Express) ---
echo [3/4] Starting Gateway (Node/Express)...
start "GenMed Gateway" cmd /k "cd /d %~dp0gateway && npm run dev"

REM --- Start Frontend (Vite/React) ---
echo [4/4] Starting Frontend (Vite/React)...
start "GenMed Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==========================================
echo   All services launched in new windows!
echo   MongoDB  -> mongodb://127.0.0.1:27017
echo   Backend  -> http://localhost:8000
echo   Gateway  -> http://localhost:5000
echo   Frontend -> http://localhost:5173
echo ==========================================
echo.
pause
