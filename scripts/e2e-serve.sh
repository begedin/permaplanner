#!/usr/bin/env bash
# Start Phoenix (MIX_ENV=test + SQL sandbox) first, then Vite for Playwright.
# Vite must not become "ready" before Phoenix accepts connections — otherwise
# Playwright workers race POST /sandbox against a dead upstream.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bash scripts/ensure-postgres.sh

export MIX_ENV=test
export PHX_SERVER=true
export PORT="${PORT:-4002}"
export PHOENIX_DEV_URL="${PHOENIX_DEV_URL:-http://127.0.0.1:${PORT}}"

mix ecto.create --quiet
mix ecto.migrate --quiet

PHX_PID=""
cleanup() {
  if [[ -n "${PHX_PID}" ]] && kill -0 "${PHX_PID}" 2>/dev/null; then
    kill "${PHX_PID}" 2>/dev/null || true
    wait "${PHX_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

npm run dev:e2e:server &
PHX_PID=$!

wait_for_phoenix() {
  local i code
  for i in $(seq 1 120); do
    # Any HTTP response means the endpoint is up (session is 401 when logged out).
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/api/auth/session" || true)"
    if [[ "${code}" =~ ^[0-9]{3}$ ]] && [[ "${code}" != "000" ]]; then
      return 0
    fi
    if ! kill -0 "${PHX_PID}" 2>/dev/null; then
      echo "Phoenix exited before becoming ready" >&2
      return 1
    fi
    sleep 0.5
  done
  echo "Timed out waiting for Phoenix on port ${PORT}" >&2
  return 1
}

wait_for_phoenix

exec npm run dev:e2e:client
