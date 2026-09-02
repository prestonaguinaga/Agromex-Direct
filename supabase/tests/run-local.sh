#!/usr/bin/env bash
# Applies the migrations to a throwaway database on a plain PostgreSQL 16 and
# runs the policy scenario tests. Connection comes from the usual PG* variables
# (PGHOST / PGPORT / PGUSER / PGPASSWORD), e.g.
#   PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres supabase/tests/run-local.sh
set -euo pipefail

cd "$(dirname "$0")/../.."
DBNAME="monarch_test_$$"
export PGDATABASE=postgres

psql -v ON_ERROR_STOP=1 -q -c "create database ${DBNAME}"
cleanup() { psql -v ON_ERROR_STOP=1 -q -c "drop database if exists ${DBNAME}" >/dev/null 2>&1 || true; }
trap cleanup EXIT

export PGDATABASE="${DBNAME}"
echo "→ stubs"
psql -v ON_ERROR_STOP=1 -q -f supabase/tests/local-stubs.sql
for f in supabase/migrations/*.sql; do
  echo "→ migration $(basename "$f")"
  psql -v ON_ERROR_STOP=1 -q -f "$f"
done
echo "→ policy tests"
psql -v ON_ERROR_STOP=1 -q -f supabase/tests/policies.sql
echo "✓ migrations apply cleanly and every policy scenario passed"
