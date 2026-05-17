#!/usr/bin/env bash
# Dump demo API JSON when the backend is up (Postgres + Redis + ./mvnw spring-boot:run).
# Usage: ./scripts/demo-api-fetch.sh [BASE_URL]
set -euo pipefail

BASE="${1:-http://localhost:8080}"
WS="11111111-1111-1111-1111-111111111111"
USER="user_demo"
H=( -H "X-Workspace-Id: $WS" -H "X-User-Id: $USER" -H "Accept: application/json" )

dump() {
  echo "=== $1 ==="
  curl -sS "${@:2}" | "${JSON_TOOL[@]}"
  echo
}

if command -v jq >/dev/null 2>&1; then
  JSON_TOOL=( jq . )
else
  JSON_TOOL=( cat )
fi

dump "GET /api/v1/workspaces" "${H[@]}" "$BASE/api/v1/workspaces"
dump "GET /api/v1/workspaces/$WS" "${H[@]}" "$BASE/api/v1/workspaces/$WS"
dump "GET /api/v1/dashboard/summary" "${H[@]}" "$BASE/api/v1/dashboard/summary"
dump "GET /api/v1/objectives" "${H[@]}" "$BASE/api/v1/objectives"
dump "GET /api/v1/objectives/aaaa1111-0000-0000-0000-000000000001" "${H[@]}" \
  "$BASE/api/v1/objectives/aaaa1111-0000-0000-0000-000000000001"
dump "GET /api/v1/key-results/bbbb2222-0000-0000-0000-000000000101" "${H[@]}" \
  "$BASE/api/v1/key-results/bbbb2222-0000-0000-0000-000000000101"
dump "GET /api/v1/key-results/bbbb2222-0000-0000-0000-000000000101/check-ins" "${H[@]}" \
  "$BASE/api/v1/key-results/bbbb2222-0000-0000-0000-000000000101/check-ins"
dump "GET /api/v1/members" "${H[@]}" "$BASE/api/v1/members"
dump "GET /api/v1/audit?limit=20" "${H[@]}" "$BASE/api/v1/audit?limit=20"
