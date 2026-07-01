#!/usr/bin/env bash
# Starts all services for local development.
# For production / other OS → use: docker-compose up --build
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
VENV="$ROOT/.venv/bin/activate"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

# ── Redis ────────────────────────────────────────────────────────────────────
if ! redis-cli ping &>/dev/null; then
  echo -e "${RED}Redis no está corriendo. Inicia Redis primero:${NC}"
  echo "  redis-server --daemonize yes"
  echo ""
  echo -e "${YELLOW}Alternativa: usa Docker (no necesita nada instalado):${NC}"
  echo "  docker-compose up --build"
  exit 1
fi
echo -e "${GREEN}✓ Redis OK${NC}"

# ── Tectonic (LaTeX compiler) ────────────────────────────────────────────────
# Installs the binary to .venv/bin/ so no sudo / package manager needed.
TECTONIC_BIN="$ROOT/.venv/bin/tectonic"

if ! command -v tectonic &>/dev/null && [ ! -f "$TECTONIC_BIN" ]; then
  echo -e "${YELLOW}⚠ Tectonic no encontrado. Instalando...${NC}"

  OS="$(uname -s)"
  ARCH="$(uname -m)"

  # Try OS package manager first (no download needed)
  if command -v dnf &>/dev/null; then
    sudo dnf install -y tectonic && echo -e "${GREEN}✓ Tectonic instalado via dnf${NC}"
  elif command -v apt-get &>/dev/null; then
    sudo apt-get install -y tectonic && echo -e "${GREEN}✓ Tectonic instalado via apt${NC}"
  elif command -v brew &>/dev/null; then
    brew install tectonic && echo -e "${GREEN}✓ Tectonic instalado via brew${NC}"
  else
    # Fallback: download binary from GitHub releases
    if [ "$OS" = "Linux" ] && [ "$ARCH" = "x86_64" ]; then
      TARGET="x86_64-unknown-linux-musl"
    elif [ "$OS" = "Darwin" ] && [ "$ARCH" = "arm64" ]; then
      TARGET="aarch64-apple-darwin"
    elif [ "$OS" = "Darwin" ] && [ "$ARCH" = "x86_64" ]; then
      TARGET="x86_64-apple-darwin"
    else
      echo -e "${RED}No se pudo instalar tectonic automáticamente.${NC}"
      echo -e "${YELLOW}Usa Docker:  docker-compose up --build${NC}"
      exit 1
    fi
    TAG=$(curl -fsSL "https://api.github.com/repos/tectonic-typesetting/tectonic/releases/latest" \
          | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": "\(.*\)".*/\1/')
    VER="${TAG#tectonic@}"
    URL="https://github.com/tectonic-typesetting/tectonic/releases/download/${TAG}/tectonic-${VER}-${TARGET}.tar.gz"
    curl -fsSL "$URL" | tar -xz -C "$ROOT/.venv/bin/"
    chmod +x "$TECTONIC_BIN"
    echo -e "${GREEN}✓ Tectonic ${VER} instalado en .venv/bin/${NC}"
  fi
fi
echo -e "${GREEN}✓ Tectonic OK${NC}"

# ── Storage dir ──────────────────────────────────────────────────────────────
mkdir -p "$ROOT/storage"

# ── Backend API ──────────────────────────────────────────────────────────────
(
  source "$VENV"
  cd "$ROOT/backend"
  echo -e "${BLUE}[API] Iniciando FastAPI en http://localhost:8000${NC}"
  PYTHONPATH=. uvicorn app.main:app --reload --port 8000 --log-level warning 2>&1 \
    | sed "s/^/$(printf "${BLUE}[API]${NC} ")/"
) &
API_PID=$!

sleep 1

# ── Celery worker ────────────────────────────────────────────────────────────
(
  source "$VENV"
  cd "$ROOT/backend"
  echo -e "${YELLOW}[WORKER] Iniciando Celery worker${NC}"
  PYTHONPATH=. TORCH_DEVICE=cpu celery -A app.workers.celery_app.celery_app worker \
    --loglevel=warning --concurrency=1 2>&1 \
    | sed "s/^/$(printf "${YELLOW}[WORKER]${NC} ")/"
) &
WORKER_PID=$!

# ── Frontend ─────────────────────────────────────────────────────────────────
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
