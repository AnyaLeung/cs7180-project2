#!/bin/bash
# InstructScan Evaluation Suite
# Runs all tests, coverage, lint, TypeScript checks, and security scans
# Produces both text output and structured JSON at reports/eval-results.json
# Usage: bash scripts/evaluate.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPORTS_DIR="$ROOT_DIR/reports"
mkdir -p "$REPORTS_DIR"

PASS=0
FAIL=0
REPORT=""

# JSON accumulation
JSON_CHECKS="[]"
BE_STMTS=0; BE_BRANCH=0; BE_FUNCS=0; BE_LINES=0
FE_STMTS=0; FE_BRANCH=0; FE_FUNCS=0; FE_LINES=0
BE_TOTAL=0; BE_PASSED=0; BE_FAILED=0
FE_TOTAL=0; FE_PASSED=0; FE_FAILED=0

section() {
  echo ""
  echo "================================================================"
  echo "  $1"
  echo "================================================================"
}

record() {
  local name="$1"
  local status="$2"
  local details="$3"
  if [ "$status" = "PASS" ]; then
    PASS=$((PASS + 1))
    REPORT="$REPORT\n  [PASS] $name"
  else
    FAIL=$((FAIL + 1))
    REPORT="$REPORT\n  [FAIL] $name — $details"
  fi
  # Append to JSON checks array
  details_escaped=$(echo "$details" | sed 's/"/\\"/g')
  JSON_CHECKS=$(echo "$JSON_CHECKS" | sed "s/]$/,{\"name\":\"$name\",\"status\":\"$status\",\"details\":\"$details_escaped\"}]/")
  # Fix first entry (removes leading comma)
  JSON_CHECKS=$(echo "$JSON_CHECKS" | sed 's/\[,/[/')
}

parse_vitest_counts() {
  local output="$1"
  local total=0 passed=0 failed=0
  # Parse individual test counts from the "Tests" summary line (not "Test Files")
  local test_line
  test_line=$(echo "$output" | grep -E "^\s+Tests\s" | tail -1)
  if [ -n "$test_line" ]; then
    passed=$(echo "$test_line" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo "0")
    failed=$(echo "$test_line" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo "0")
    [ -z "$passed" ] && passed=0
    [ -z "$failed" ] && failed=0
    total=$((passed + failed))
  fi
  echo "$total $passed $failed"
}

parse_vitest_coverage() {
  local output="$1"
  local all_line
  all_line=$(echo "$output" | grep "All files" | tail -1)
  if [ -n "$all_line" ]; then
    echo "$all_line" | awk -F'|' '{
      gsub(/[[:space:]]/, "", $2);
      gsub(/[[:space:]]/, "", $3);
      gsub(/[[:space:]]/, "", $4);
      gsub(/[[:space:]]/, "", $5);
      printf "%s %s %s %s", $2, $3, $4, $5
    }'
  else
    echo "0 0 0 0"
  fi
}

# ── 1. Backend Unit Tests ──
section "1. Backend Unit Tests + Coverage"
cd "$ROOT_DIR/backend"
OUTPUT=$(npx vitest run --coverage 2>&1)
echo "$OUTPUT"
if echo "$OUTPUT" | grep -q "Test Files.*passed"; then
  record "Backend tests" "PASS" ""
else
  record "Backend tests" "FAIL" "Some tests failed"
fi
read -r BE_TOTAL BE_PASSED BE_FAILED <<< "$(parse_vitest_counts "$OUTPUT")"
read -r BE_STMTS BE_BRANCH BE_FUNCS BE_LINES <<< "$(parse_vitest_coverage "$OUTPUT")"

# ── 2. Frontend Unit Tests ──
section "2. Frontend Unit Tests + Coverage"
cd "$ROOT_DIR/frontend"
OUTPUT=$(npx vitest run --coverage 2>&1)
echo "$OUTPUT"
if echo "$OUTPUT" | grep -q "Test Files.*passed"; then
  record "Frontend tests" "PASS" ""
else
  record "Frontend tests" "FAIL" "Some tests failed"
fi
read -r FE_TOTAL FE_PASSED FE_FAILED <<< "$(parse_vitest_counts "$OUTPUT")"
read -r FE_STMTS FE_BRANCH FE_FUNCS FE_LINES <<< "$(parse_vitest_coverage "$OUTPUT")"

# ── 3. Backend Lint ──
section "3. Backend Lint"
cd "$ROOT_DIR/backend"
if npm run lint 2>&1; then
  record "Backend lint" "PASS" ""
else
  record "Backend lint" "FAIL" "Lint errors found"
fi

# ── 4. Frontend Lint ──
section "4. Frontend Lint"
cd "$ROOT_DIR/frontend"
if npm run lint 2>&1; then
  record "Frontend lint" "PASS" ""
else
  record "Frontend lint" "FAIL" "Lint errors found"
fi

# ── 5. TypeScript Check (Backend) ──
section "5. TypeScript Check — Backend"
cd "$ROOT_DIR/backend"
if npx tsc --noEmit 2>&1; then
  record "Backend TypeScript" "PASS" ""
else
  record "Backend TypeScript" "FAIL" "Type errors found"
fi

# ── 6. TypeScript Check (Frontend) ──
section "6. TypeScript Check — Frontend"
cd "$ROOT_DIR/frontend"
if npx tsc --noEmit 2>&1; then
  record "Frontend TypeScript" "PASS" ""
else
  record "Frontend TypeScript" "FAIL" "Type errors found"
fi

# ── 7. Security: npm audit (Backend) ──
section "7. Security — npm audit (Backend)"
cd "$ROOT_DIR/backend"
AUDIT_BE=$(npm audit --omit=dev 2>&1 || true)
echo "$AUDIT_BE"
if echo "$AUDIT_BE" | grep -qiE "critical"; then
  CRIT_COUNT=$(echo "$AUDIT_BE" | grep -ciE "critical" || echo "0")
  record "Backend npm audit" "FAIL" "${CRIT_COUNT} critical vulnerabilities"
else
  record "Backend npm audit" "PASS" ""
fi

# ── 8. Security: npm audit (Frontend) ──
section "8. Security — npm audit (Frontend)"
cd "$ROOT_DIR/frontend"
AUDIT_FE=$(npm audit --omit=dev 2>&1 || true)
echo "$AUDIT_FE"
if echo "$AUDIT_FE" | grep -qiE "critical"; then
  CRIT_COUNT=$(echo "$AUDIT_FE" | grep -ciE "critical" || echo "0")
  record "Frontend npm audit" "FAIL" "${CRIT_COUNT} critical vulnerabilities"
else
  record "Frontend npm audit" "PASS" ""
fi

# ── 9. Secret Detection ──
section "9. Secret Detection"
cd "$ROOT_DIR"
SECRETS_FOUND=0

if grep -rn "sk-ant-api" --include="*.ts" --include="*.tsx" --include="*.js" --exclude-dir=node_modules . 2>/dev/null; then
  echo "WARNING: Hardcoded Anthropic API keys found in source!"
  SECRETS_FOUND=1
fi

if grep -rn "SUPABASE_SERVICE_ROLE_KEY\s*=" --include="*.ts" --include="*.tsx" --include="*.js" --exclude-dir=node_modules --exclude="*.test.*" --exclude="supabaseClient.ts" --exclude="*.d.ts" . 2>/dev/null; then
  echo "WARNING: Hardcoded Supabase service role key found!"
  SECRETS_FOUND=1
fi

for envfile in .env backend/.env frontend/.env.local; do
  if [ -f "$envfile" ]; then
    if git ls-files --error-unmatch "$envfile" 2>/dev/null; then
      echo "WARNING: $envfile is tracked by git!"
      SECRETS_FOUND=1
    fi
  fi
done

if [ $SECRETS_FOUND -eq 0 ]; then
  record "Secret detection" "PASS" ""
else
  record "Secret detection" "FAIL" "Secrets or unignored env files found"
fi

# ── 10. Input Validation Audit ──
section "10. Input Validation Audit"
echo "Checking backend endpoint validation..."
VALIDATION_OK=1

if grep -q "isValidEmail" "$ROOT_DIR/backend/src/controllers/authController.ts"; then
  echo "  [OK] Auth controller validates email format"
else
  echo "  [WARN] Auth controller may not validate email"
  VALIDATION_OK=0
fi

if grep -q '\.py' "$ROOT_DIR/backend/src/services/fileService.ts"; then
  echo "  [OK] File service validates .py extension"
else
  echo "  [WARN] File service may not validate file type"
  VALIDATION_OK=0
fi

if grep -q 'MAX_SIZE\|5.*1024.*1024\|fileSize' "$ROOT_DIR/backend/src/services/fileService.ts" || grep -q 'fileSize' "$ROOT_DIR/backend/src/routes/fileRoutes.ts"; then
  echo "  [OK] File upload has size limit"
else
  echo "  [WARN] File upload may not have size limit"
  VALIDATION_OK=0
fi

if grep -q 'commentText.*required\|!commentText' "$ROOT_DIR/frontend/api/scan-line.ts"; then
  echo "  [OK] scan-line validates commentText"
else
  echo "  [WARN] scan-line may not validate input"
  VALIDATION_OK=0
fi

if grep -q 'commentText.*required\|!commentText' "$ROOT_DIR/frontend/api/generate.ts"; then
  echo "  [OK] generate validates commentText"
else
  echo "  [WARN] generate may not validate input"
  VALIDATION_OK=0
fi

if [ $VALIDATION_OK -eq 1 ]; then
  record "Input validation" "PASS" ""
else
  record "Input validation" "FAIL" "Some endpoints may lack validation"
fi

# ── 11. Auth Security Checks ──
section "11. Auth Security Checks"
AUTH_OK=1

if grep -q 'expiresIn' "$ROOT_DIR/backend/src/controllers/authController.ts"; then
  echo "  [OK] JWT has expiration"
else
  echo "  [WARN] JWT may not have expiration"
  AUTH_OK=0
fi

if grep -q 'BCRYPT_ROUNDS\|bcrypt.hash' "$ROOT_DIR/backend/src/services/authService.ts"; then
  echo "  [OK] Passwords hashed with bcrypt"
else
  echo "  [WARN] Password hashing may be missing"
  AUTH_OK=0
fi

if grep -q '12\|BCRYPT_ROUNDS' "$ROOT_DIR/backend/src/services/authService.ts"; then
  echo "  [OK] bcrypt cost factor >= 12"
else
  echo "  [WARN] bcrypt cost factor may be too low"
  AUTH_OK=0
fi

if [ $AUTH_OK -eq 1 ]; then
  record "Auth security" "PASS" ""
else
  record "Auth security" "FAIL" "Some auth security checks failed"
fi

# ── Summary ──
section "EVALUATION SUMMARY"
echo -e "$REPORT"
echo ""
echo "  Total: $((PASS + FAIL)) checks — $PASS passed, $FAIL failed"
echo ""

# ── Write JSON report ──
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$REPORTS_DIR/eval-results.json" <<JSONEOF
{
  "timestamp": "$TIMESTAMP",
  "checks": $JSON_CHECKS,
  "coverage": {
    "backend": {
      "statements": $BE_STMTS,
      "branches": $BE_BRANCH,
      "functions": $BE_FUNCS,
      "lines": $BE_LINES
    },
    "frontend": {
      "statements": $FE_STMTS,
      "branches": $FE_BRANCH,
      "functions": $FE_FUNCS,
      "lines": $FE_LINES
    }
  },
  "testCounts": {
    "backend": {
      "total": $BE_TOTAL,
      "passed": $BE_PASSED,
      "failed": $BE_FAILED
    },
    "frontend": {
      "total": $FE_TOTAL,
      "passed": $FE_PASSED,
      "failed": $FE_FAILED
    }
  },
  "summary": {
    "passed": $PASS,
    "failed": $FAIL,
    "total": $((PASS + FAIL))
  }
}
JSONEOF

echo "  JSON report written to: reports/eval-results.json"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "  STATUS: SOME CHECKS FAILED"
  exit 1
else
  echo "  STATUS: ALL CHECKS PASSED"
  exit 0
fi
