#!/usr/bin/env bash
# Deploy to Fly (Vite frontend + Phoenix release).
#
# Usage:
#   ./scripts/fly-deploy-op.sh
#   ./scripts/fly-deploy-op.sh --remote-only

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

exec fly deploy "$@"
