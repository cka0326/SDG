#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ⚡ Datagen – AI Insurance Data Generator"
echo "  ─────────────────────────────────────────"
echo ""

# ── pre-flight checks ──────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "  ✗ Python 3 is required. Install it from https://python.org"
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "  ✗ Node.js is required. Install it from https://nodejs.org"
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo "  ✗ npm is required. Install Node.js from https://nodejs.org"
  exit 1
fi

# ── API key ──────────────────────────────────────────────────────────────────
if [ -f "$ROOT_DIR/backend/.env" ]; then
  source "$ROOT_DIR/backend/.env" 2>/dev/null || true
fi

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "  ⚠  ANTHROPIC_API_KEY is not set."
  echo ""
  echo "  Create the file  backend/.env  with your key:"
  echo "    ANTHROPIC_API_KEY=sk-ant-..."
  echo ""
  echo "  Then re-run this script."
  echo ""
  exit 1
fi

echo "  ✓ API key detected"

# ── backend setup ─────────────────────────────────────────────────────────────
echo "  → Setting up Python backend…"
cd "$ROOT_DIR/backend"

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

# shellcheck disable=SC1091
source venv/bin/activate
pip install -q -r requirements.txt

# ── frontend setup ────────────────────────────────────────────────────────────
echo "  → Installing frontend packages…"
cd "$ROOT_DIR/frontend"
npm install --silent

# ── start servers ─────────────────────────────────────────────────────────────
echo ""
echo "  Starting servers:"
echo "    Backend  →  http://localhost:8000"
echo "    Frontend →  http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

cd "$ROOT_DIR/backend"
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

# ── open browser ──────────────────────────────────────────────────────────────
sleep 2
if command -v open &>/dev/null; then
  open http://localhost:5173
elif command -v xdg-open &>/dev/null; then
  xdg-open http://localhost:5173
fi

# ── wait ──────────────────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "  Stopping servers…"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

wait "$BACKEND_PID" "$FRONTEND_PID"
