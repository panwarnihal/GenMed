@echo off
title GenMed - Starting All Services

echo ==========================================
echo   GenMed - Launching All Services
echo ==========================================
echo.

REM --- Start Backend (FastAPI) ---
echo [1/3] Starting Backend (FastAPI)...
start "GenMed Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && uvicorn main:app --reload --port 8000"

REM --- Start Gateway (Node/Express) ---
echo [2/3] Starting Gateway (Node/Express)...
start "GenMed Gateway" cmd /k "cd /d %~dp0gateway && npm run dev"

REM --- Start Frontend (Vite/React) ---
echo [3/3] Starting Frontend (Vite/React)...
start "GenMed Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==========================================
echo   All services launched in new windows!
echo   Backend  -> http://localhost:8000
echo   Gateway  -> http://localhost:5000
echo   Frontend -> http://localhost:5173
echo ==========================================
echo.
pause
