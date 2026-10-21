#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

bash scripts/docker-up.sh up --build -d

APP_PORT="${APP_HOST_PORT:-3010}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"

echo ""
echo "Stack is up."
echo "App:            http://localhost:${APP_PORT}"
echo "MinIO Console:  http://localhost:${MINIO_CONSOLE_PORT}"
echo ""
echo "Check status: docker compose ps"
echo "Follow logs:   docker compose logs -f app"
