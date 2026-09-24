#!/usr/bin/env bash
# API smoke test for DB_DRIVER=sql against STAGING_DATABASE_URL (or DATABASE_URL).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^# ]] && continue
    [[ "$line" =~ ^(STAGING_DATABASE_URL|DATABASE_URL|PLATFORM_API_KEY|SMOKE_EMAIL|SMOKE_PASSWORD)= ]] || continue
    export "$line"
  done < .env
fi

BASE="${SMOKE_BASE_URL:-http://localhost:3010}"
EMAIL="${SMOKE_EMAIL:-dagdelen@gmail.com}"
PASS="${SMOKE_PASSWORD:-SqlSmoke1!}"
API_KEY="${PLATFORM_API_KEY:-}"

echo "=== SQL smoke test ==="
echo "  Base: $BASE"
echo "  User: $EMAIL"
echo ""

health=$(curl -sf "$BASE/api/health")
echo "$health" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('sqlReady'), d; print('✓ health:', d['status'], 'dbDriver='+d['dbDriver'], 'sqlReady='+str(d['sqlReady']))"

login=$(curl -sf -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$login" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
echo "✓ login: token issued"

me=$(curl -sf "$BASE/api/auth/me" -H "Authorization: Bearer $TOKEN")
echo "$me" | python3 -c "import sys,json; p=json.load(sys.stdin)['data']['profile']; print('✓ auth/me:', p['email'], p['role'])"

count_rows() {
  python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data', d.get('docs',[]))))"
}
first_field() {
  python3 -c "import sys,json; d=json.load(sys.stdin); rows=d.get('data', d.get('docs',[])); print(rows[0].get('$1','') if rows else '')"
}

cust_n=$(curl -sf "$BASE/api/db/customers" -H "Authorization: Bearer $TOKEN" | count_rows)
cust_name=$(curl -sf "$BASE/api/db/customers" -H "Authorization: Bearer $TOKEN" | first_field name)
echo "✓ db/customers: $cust_n rows (e.g. $cust_name)"

cid=$(curl -sf "$BASE/api/db/customers" -H "Authorization: Bearer $TOKEN" | first_field id)
proj_n=$(curl -sf "$BASE/api/db/projects?customerId=$cid" -H "Authorization: Bearer $TOKEN" | count_rows)
proj_name=$(curl -sf "$BASE/api/db/projects?customerId=$cid" -H "Authorization: Bearer $TOKEN" | first_field name)
echo "✓ db/projects: $proj_n for customer (e.g. $proj_name)"

pid=$(curl -sf "$BASE/api/db/projects?customerId=$cid" -H "Authorization: Bearer $TOKEN" | first_field id)
if [[ -n "$pid" ]]; then
  pq_n=$(curl -sf "$BASE/api/db/projectQuestions?projectId=$pid" -H "Authorization: Bearer $TOKEN" | count_rows)
  asn_n=$(curl -sf "$BASE/api/db/assignments?projectId=$pid" -H "Authorization: Bearer $TOKEN" | count_rows)
  echo "✓ db/projectQuestions: $pq_n for project ${pid:0:8}..."
  echo "✓ db/assignments: $asn_n"
fi

capi=$(curl -sf "$BASE/api/v1/customer/customers" -H "x-api-key: $API_KEY")
echo "$capi" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('success'); print('✓ customer API: count='+str(d.get('count')))"

em_n=$(curl -sf "$BASE/api/emissions/factors" -H "Authorization: Bearer $TOKEN" | count_rows)
echo "✓ emissions/factors: $em_n"

echo ""
echo "All smoke checks passed."
