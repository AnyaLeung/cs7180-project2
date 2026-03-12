#!/bin/bash
# InstructScan — Full Evaluation Pipeline
# Runs tests/quality checks, LLM benchmark, and generates the HTML dashboard.
#
# Usage:
#   bash scripts/run-eval-dashboard.sh           # full pipeline (needs API key)
#   bash scripts/run-eval-dashboard.sh --skip-llm # skip the LLM benchmark
#
# Prerequisites:
#   - npm install in both backend/ and frontend/
#   - ANTHROPIC_API_KEY set in environment or frontend/.env.local (for LLM eval)
#   - Local dev API server running (npm run dev:api in frontend/) OR
#     set EVAL_API_URL to a deployed endpoint

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SKIP_LLM=false

for arg in "$@"; do
  if [ "$arg" = "--skip-llm" ]; then
    SKIP_LLM=true
  fi
done

echo "============================================"
echo "  InstructScan Evaluation Pipeline"
echo "============================================"
echo ""

# Step 1: Run evaluate.sh (tests, lint, security)
echo "[1/3] Running test suite, code quality, and security checks..."
echo ""
bash "$ROOT_DIR/scripts/evaluate.sh"
EVAL_EXIT=$?
echo ""

# Step 2: Run LLM benchmark (optional)
if [ "$SKIP_LLM" = false ]; then
  echo "[2/3] Running LLM instruction detection benchmark..."
  echo ""

  if [ -z "$ANTHROPIC_API_KEY" ]; then
    if [ -f "$ROOT_DIR/frontend/.env.local" ]; then
      ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY "$ROOT_DIR/frontend/.env.local" | cut -d '=' -f2)
      export ANTHROPIC_API_KEY
    fi
  fi

  if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "WARNING: ANTHROPIC_API_KEY not set. Skipping LLM benchmark."
    echo "  Set it via: export ANTHROPIC_API_KEY=sk-..."
  else
    cd "$ROOT_DIR/frontend"
    npx tsx "$ROOT_DIR/scripts/run-llm-eval.ts"
  fi
  echo ""
else
  echo "[2/3] Skipping LLM benchmark (--skip-llm)"
  echo ""
fi

# Step 3: Generate dashboard
echo "[3/3] Generating HTML dashboard..."
echo ""
cd "$ROOT_DIR/frontend"
npx tsx "$ROOT_DIR/scripts/generate-dashboard.ts"
echo ""

DASHBOARD_PATH="$ROOT_DIR/reports/dashboard.html"
if [ -f "$DASHBOARD_PATH" ]; then
  echo "============================================"
  echo "  Dashboard ready: reports/dashboard.html"
  echo "============================================"
  echo ""
  echo "  Open it with:  open reports/dashboard.html"
else
  echo "ERROR: Dashboard generation failed."
  exit 1
fi

exit $EVAL_EXIT
