#!/usr/bin/env bash
# Starts all three services in parallel with colored output
# Usage: ./dev.sh
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
VENV="$ROOT/.venv/bin/activate"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

# Ensure Redis is running
if ! redis-cli ping &>/dev/null; then
  echo -e "${RED}Redis no está corriendo. Inicia Redis primero:${NC}"
  echo "  redis-server --daemonize yes"
  exit 1
fi
echo -e "${GREEN}✓ Redis OK${NC}"

# Create storage dir
mkdir -p "$ROOT/storage"

# Start backend API
(
  source "$VENV"
  cd "$ROOT/backend"
  echo -e "${BLUE}[API] Iniciando FastAPI en http://localhost:8000${NC}"
  PYTHONPATH=. uvicorn app.main:app --reload --port 8000 --log-level warning 2>&1 \
    | sed "s/^/$(printf "${BLUE}[API]${NC} ")/"
) &
API_PID=$!

sleep 1  # let API start before worker

# Start Celery worker
(
  source "$VENV"
  cd "$ROOT/backend"
  echo -e "${YELLOW}[WORKER] Iniciando Celery worker${NC}"
  PYTHONPATH=. TORCH_DEVICE=cpu celery -A app.workers.celery_app.celery_app worker \
    --loglevel=warning --concurrency=1 2>&1 \
    | sed "s/^/$(printf "${YELLOW}[WORKER]${NC} ")/"
) &
WORKER_PID=$!

# Start frontend
(
  cd "$ROOT/frontend"
  echo -e "${GREEN}[FRONT] Iniciando Vite en http://localhost:3000${NC}"
  npm run dev 2>&1 | sed "s/^/$(printf "${GREEN}[FRONT]${NC} ")/"
) &
FRONT_PID=$!

echo ""
echo -e "  ${GREEN}Frontend:${NC} http://localhost:3000"
echo -e "  ${BLUE}API docs:${NC} http://localhost:8000/docs"
echo ""
echo "Ctrl+C para detener todo."

trap "kill $API_PID $WORKER_PID $FRONT_PID 2>/dev/null; exit 0" INT TERM
wait
