#!/usr/bin/env bash
# Ensure the asdf Postgres instance for this project is running on 5433 with the
# expected databases before starting dev.
#
# - Not running → start via pg_ctl (asdf PGDATA)
# - Running, missing permaplanner_dev / permaplanner_test → mix ecto.setup (dev + test)
# - Running, unexpected user databases → list them and exit 1

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PGPORT=5433
DEV_DB=permaplanner_dev
TEST_DB=permaplanner_test
PGDATA="$(asdf where postgres)/data"
PGLOG="$(dirname "$PGDATA")/postgres.log"
POSTGRES_CONF="$PGDATA/postgresql.conf"

if [[ ! -d "$PGDATA" ]]; then
  echo "asdf Postgres data directory not found: $PGDATA" >&2
  echo "Run: asdf install" >&2
  exit 1
fi

ensure_port_config() {
  if grep -qE "^port = ${PGPORT}[[:space:]]*$" "$POSTGRES_CONF"; then
    return
  fi

  if grep -qE "^#?port = " "$POSTGRES_CONF"; then
    sed -i '' -E "s/^#?port = .*/port = ${PGPORT}/" "$POSTGRES_CONF"
  else
    echo "port = ${PGPORT}" >>"$POSTGRES_CONF"
  fi

  echo "Set asdf Postgres port to ${PGPORT} in $POSTGRES_CONF"
}

postgres_ready() {
  pg_isready -h localhost -p "$PGPORT" -U postgres -q 2>/dev/null
}

postgres_running_for_data_dir() {
  pg_ctl -D "$PGDATA" status >/dev/null 2>&1
}

start_postgres() {
  pg_ctl -D "$PGDATA" -l "$PGLOG" start
}

wait_for_postgres() {
  for _ in $(seq 1 50); do
    if postgres_ready; then
      return 0
    fi
    sleep 0.2
  done
  return 1
}

db_exists() {
  local db="$1"
  [[ "$(psql -h localhost -p "$PGPORT" -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${db}'")" == "1" ]]
}

list_user_databases() {
  psql -h localhost -p "$PGPORT" -U postgres -tAc \
    "SELECT datname FROM pg_database WHERE datistemplate = false AND datname <> 'postgres' ORDER BY datname"
}

ensure_port_config

if ! postgres_ready; then
  if postgres_running_for_data_dir; then
    echo "Stopping asdf Postgres to apply port ${PGPORT}..."
    pg_ctl -D "$PGDATA" stop
  fi

  echo "Starting asdf Postgres on port ${PGPORT}..."
  start_postgres

  if ! wait_for_postgres; then
    echo "Postgres failed to start on port ${PGPORT}. See $PGLOG" >&2
    exit 1
  fi
fi

user_dbs=()
while IFS= read -r db; do
  [[ -z "$db" ]] && continue
  user_dbs+=("$db")
done < <(list_user_databases)

unexpected=()
for db in "${user_dbs[@]}"; do
  if [[ "$db" != "$DEV_DB" && "$db" != "$TEST_DB" ]]; then
    unexpected+=("$db")
  fi
done

if [[ ${#unexpected[@]} -gt 0 ]]; then
  echo "Unexpected databases on asdf Postgres (port ${PGPORT}):" >&2
  printf '  %s\n' "${unexpected[@]}" >&2
  echo "This instance should only contain ${DEV_DB} and ${TEST_DB}." >&2
  exit 1
fi

if ! db_exists "$DEV_DB" || ! db_exists "$TEST_DB"; then
  echo "Creating permaplanner databases..."
  mix ecto.setup
  MIX_ENV=test mix ecto.setup
fi
