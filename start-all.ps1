$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   GenMed - Launching All Services" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# --- Start Backend (FastAPI) ---
Write-Host "[1/3] Starting Backend (FastAPI on :8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\backend'; .\venv\Scripts\Activate.ps1; uvicorn main:app --reload --port 8000" -WindowStyle Normal

Start-Sleep -Milliseconds 500

# --- Start Gateway (Node/Express) ---
Write-Host "[2/3] Starting Gateway (Node/Express)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\gateway'; npm run dev" -WindowStyle Normal

Start-Sleep -Milliseconds 500

# --- Start Frontend (Vite/React) ---
Write-Host "[3/3] Starting Frontend (Vite on :5173)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  All services launched in new windows!" -ForegroundColor Cyan
Write-Host "  Backend  -> http://localhost:8000" -ForegroundColor Green
Write-Host "  Gateway  -> http://localhost:5000" -ForegroundColor Yellow
Write-Host "  Frontend -> http://localhost:5173" -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
