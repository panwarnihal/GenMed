$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   GenMed - Launching All Services" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# --- Check MongoDB ---
Write-Host "[1/4] Checking MongoDB..." -ForegroundColor Gray
$mongoConn = Test-NetConnection -ComputerName 127.0.0.1 -Port 27017 -WarningAction SilentlyContinue
if ($mongoConn.TcpTestSucceeded) {
    Write-Host "  MongoDB is running on port 27017." -ForegroundColor DarkGray
} else {
    Write-Host "  Attempting to start MongoDB service..." -ForegroundColor Yellow
    Start-Service MongoDB -ErrorAction SilentlyContinue
}

# --- Start Backend (FastAPI) ---
Write-Host "[2/4] Starting Backend (FastAPI on :8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "`$env:PYTHONUTF8='1'; cd '$Root\backend'; .\venv\Scripts\Activate.ps1; uvicorn main:app --reload --port 8000" -WindowStyle Normal

Start-Sleep -Milliseconds 500

# --- Start Gateway (Node/Express) ---
Write-Host "[3/4] Starting Gateway (Node/Express on :5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\gateway'; npm run dev" -WindowStyle Normal

Start-Sleep -Milliseconds 500

# --- Start Frontend (Vite/React) ---
Write-Host "[4/4] Starting Frontend (Vite on :5173)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  All services launched in new windows!" -ForegroundColor Cyan
Write-Host "  Backend  -> http://localhost:8000" -ForegroundColor Green
Write-Host "  Gateway  -> http://localhost:5000" -ForegroundColor Yellow
Write-Host "  Frontend -> http://localhost:5173" -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
