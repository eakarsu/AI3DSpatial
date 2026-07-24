#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; cd "$root"
test -f .env || { echo 'Missing .env; copy .env.example and configure it.' >&2; exit 1; }
set -a; source .env; set +a; : "${BACKEND_PORT:=3001}" "${FRONTEND_PORT:=3000}"
: "${OPENROUTER_API_KEY:?OPENROUTER_API_KEY is required}"
: "${OPENROUTER_MODEL:?OPENROUTER_MODEL is required}"
: "${OPENROUTER_BASE_URL:?OPENROUTER_BASE_URL is required}"
[ "$OPENROUTER_BASE_URL" = "https://openrouter.ai/api/v1" ] || { echo 'OPENROUTER_BASE_URL must be https://openrouter.ai/api/v1' >&2; exit 1; }
test -d node_modules && test -d client/node_modules || { echo 'Dependencies absent; run scripts/bootstrap.sh.' >&2; exit 1; }
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do if lsof -ti ":$port" >/dev/null 2>&1; then echo "Port $port is occupied; refusing to terminate another process." >&2; exit 1; fi; done
if [ "${MIGRATE_ON_START:-false}" = true ]; then
  case "${ALLOW_SCHEMA_MIGRATION:-}" in 1|true) ;; *) echo 'ALLOW_SCHEMA_MIGRATION=1 or true is required for startup migration.' >&2; exit 1;; esac
  ./scripts/migrate.sh
  node server/scripts/create-admin.js
fi
CLIENT_URL="http://127.0.0.1:$FRONTEND_PORT" node server/index.js & backend_pid=$!
(cd client && PORT="$FRONTEND_PORT" BROWSER=none REACT_APP_API_URL="http://127.0.0.1:$BACKEND_PORT/api" npm start) & frontend_pid=$!
cleanup(){ kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; }; trap cleanup EXIT INT TERM
wait "$backend_pid" "$frontend_pid"
