#!/usr/bin/env bash
# Deploy to Fly with Vite build args from 1Password.
#
# Prerequisites: `op` signed in, `.env.fly` (gitignored) with op:// refs — same shape as .env.1password.example
#
# Usage:
#   ./scripts/fly-deploy-op.sh
#   ./scripts/fly-deploy-op.sh --remote-only
#
# Runtime secret GITHUB_CLIENT_SECRET is not baked into the image; set on Fly:
#   fly secrets set GITHUB_CLIENT_SECRET="$(op read 'op://…/…/github_client_secret')"

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE=".env.fly"
ENV_PATH="${ROOT}/${ENV_FILE}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "WARNING: ${ENV_FILE} is missing (expected at ${ENV_PATH})." >&2
  echo "  Deploy needs 1Password references for the Vite build (see .env.1password.example)." >&2
  echo "  Create ${ENV_FILE} with op://… lines, or copy from .env.1password and adjust." >&2
  exit 1
fi

# Inner bash + single-quoted -c so the outer shell never expands $VITE_GITHUB_CLIENT_ID before op injects it.
op run --env-file="$ENV_FILE" -- bash -c '
  set -euo pipefail
  if [[ -z "${VITE_GITHUB_CLIENT_ID:-}" ]]; then
    echo "VITE_GITHUB_CLIENT_ID is empty after op run; check op:// references in your env file" >&2
    exit 1
  fi
  exec fly deploy --build-arg "VITE_GITHUB_CLIENT_ID=${VITE_GITHUB_CLIENT_ID}" "$@"
' bash "$@"
