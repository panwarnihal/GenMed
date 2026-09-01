#!/bin/bash
echo "=========================================="
echo "   GenMed - Launching All Services"
echo "=========================================="
echo ""

# Ensure data directory exists for mongo
mkdir -p data/db

echo "[1/4] Starting Local MongoDB Service..."
mongod --dbpath data/db > data/mongod.log 2>&1 &
MONGO_PID=$!
sleep 2

echo "[2/4] Starting Backend (FastAPI)..."
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000 > ../data/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "[3/4] Starting Gateway (Node/Express)..."
cd gateway
npm run dev > ../data/gateway.log 2>&1 &
GATEWAY_PID=$!
cd ..

echo "[4/4] Starting Frontend (Vite/React)..."
cd frontend
npm run dev > ../data/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo "=========================================="
echo "  All services launched in the background!"
echo "  MongoDB  -> mongodb://127.0.0.1:27017 (PID: $MONGO_PID)"
echo "  Backend  -> http://localhost:8000 (PID: $BACKEND_PID)"
echo "  Gateway  -> http://localhost:5000 (PID: $GATEWAY_PID)"
echo "  Frontend -> http://localhost:5173 (PID: $FRONTEND_PID)"
echo "=========================================="
echo "To stop services, run: kill $MONGO_PID $BACKEND_PID $GATEWAY_PID $FRONTEND_PID"
echo "Logs are available in the data/ directory."
echo ""

# Wait for all background processes
wait
