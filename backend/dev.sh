#!/usr/bin/env bash
# One-shot local backend: creates .venv if missing, syncs requirements.txt with uv, starts uvicorn with reload.
# Works from any shell (fish included) and any cwd: ./dev.sh   (PORT=8001 ./dev.sh to change the port)
set -euo pipefail

cd "$(dirname "$0")"
PORT="${PORT:-8000}"
export UV_LINK_MODE=copy  # project lives on a different filesystem than uv's cache; silences the hardlink warning

log() { echo "[dev.sh] $*"; }

if [ ! -f .env ]; then
  log "ERROR: backend/.env not found. Run: cp .env.example .env  (then fill in the keys)"
  exit 1
fi

if [ ! -x .venv/bin/python ]; then
  log "creating .venv (python 3.12)"
  uv venv .venv --python 3.12
fi

log "syncing requirements.txt (no-op when already installed)"
uv pip install --python .venv/bin/python -r requirements.txt

log "starting uvicorn on http://localhost:${PORT} (Ctrl+C to stop)"
exec .venv/bin/python -m uvicorn app.main:app --reload --port "${PORT}"
