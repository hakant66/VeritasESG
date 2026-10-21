#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--volumes" || "${1:-}" == "-v" ]]; then
  docker compose down -v
  echo "Stack stopped and volumes removed."
else
  docker compose down
  echo "Stack stopped."
fi

echo ""
echo "Tip: run ./dev-up.sh to start again."
