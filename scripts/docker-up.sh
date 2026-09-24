#!/usr/bin/env bash
# Wrapper around `docker compose` that auto-picks a free host port for any
# service port already in use on the machine, instead of failing to start.
#
#   scripts/docker-up.sh up --build           # full stack (docker-compose.yml)
#   scripts/docker-up.sh -f docker-compose.minio.yml up -d   # MinIO-only stack
#
# Respects any port already set in the environment or in .env (those are
# left alone); only picks a replacement for ports that default value is
# currently bound on the host.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*(MINIO_API_PORT|MINIO_CONSOLE_PORT|REDIS_HOST_PORT|POSTGRES_HOST_PORT|QDRANT_HTTP_PORT|QDRANT_GRPC_PORT|APP_HOST_PORT|APP_PUBLIC_URL)=(.*)$ ]] || continue
    export "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
  done < .env
fi

# Ports already claimed by this run (either kept from env/.env or just picked),
# so two services never get assigned the same replacement port.
CLAIMED_PORTS=()

is_port_claimed() {
  local port="$1" p
  for p in "${CLAIMED_PORTS[@]:-}"; do
    [[ "$p" == "$port" ]] && return 0
  done
  return 1
}

is_port_free() {
  local port="$1"
  is_port_claimed "$port" && return 1
  if command -v lsof >/dev/null 2>&1; then
    ! lsof -iTCP -sTCP:LISTEN -nP 2>/dev/null | awk '{print $9}' | grep -q ":${port}\$"
  else
    ! (exec 3<>"/dev/tcp/127.0.0.1/${port}") 2>/dev/null
  fi
}

find_free_port() {
  local port="$1"
  local tries=0
  while (( tries < 50 )); do
    if is_port_free "$port"; then
      echo "$port"
      return 0
    fi
    port=$((port + 1))
    tries=$((tries + 1))
  done
  echo "docker-up: could not find a free port starting at $1" >&2
  exit 1
}

# pick VAR_NAME DEFAULT_PORT LABEL — honors an already-exported/`.env` value,
# otherwise finds the next free port starting at the default and exports it.
pick() {
  local var_name="$1" default_port="$2" label="$3"
  local current="${!var_name:-}"
  local chosen
  if [[ -n "$current" ]]; then
    chosen="$current"
  else
    chosen="$(find_free_port "$default_port")"
    if [[ "$chosen" != "$default_port" ]]; then
      echo "docker-up: ${label} port ${default_port} is in use, using ${chosen} instead" >&2
    fi
  fi
  CLAIMED_PORTS+=("$chosen")
  export "${var_name}=${chosen}"
}

pick MINIO_API_PORT 9000 "MinIO API"
pick MINIO_CONSOLE_PORT 9001 "MinIO console"
pick REDIS_HOST_PORT 6379 "Redis"
pick POSTGRES_HOST_PORT 5442 "Postgres"
pick QDRANT_HTTP_PORT 6333 "Qdrant HTTP"
pick QDRANT_GRPC_PORT 6334 "Qdrant gRPC"
pick APP_HOST_PORT 3010 "App"

if [[ -z "${APP_PUBLIC_URL:-}" ]]; then
  export APP_PUBLIC_URL="http://localhost:${APP_HOST_PORT}"
fi

echo "docker-up: minio_api=${MINIO_API_PORT} minio_console=${MINIO_CONSOLE_PORT} redis=${REDIS_HOST_PORT} postgres=${POSTGRES_HOST_PORT} qdrant_http=${QDRANT_HTTP_PORT} qdrant_grpc=${QDRANT_GRPC_PORT} app=${APP_HOST_PORT}" >&2

exec docker compose "$@"
