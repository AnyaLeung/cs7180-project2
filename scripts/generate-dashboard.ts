/**
 * Dashboard Generator
 *
 * Reads reports/eval-results.json and reports/llm-eval-results.json,
 * then generates a self-contained reports/dashboard.html.
 *
 * Usage: npx tsx scripts/generate-dashboard.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPORTS_DIR = resolve(__dirname, '..', 'reports');

interface CheckItem {
  name: string;
  status: string;
  details: string;
}

interface CoverageData {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

interface TestCounts {
  total: number;
  passed: number;
  failed: number;
}

interface EvalResults {
  timestamp: string;
  checks: CheckItem[];
  coverage: { backend: CoverageData; frontend: CoverageData };
  testCounts: { backend: TestCounts; frontend: TestCounts };
  summary: { passed: number; failed: number; total: number };
}

interface ConfusionMatrix {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

interface PredictionResult {
  commentText: string;
  category: string;
  expected: boolean;
  predicted: boolean;
  confidence: number;
  correct: boolean;
  responseTimeMs: number;
  error: string | null;
}

interface LlmEvalResults {
  timestamp: string;
  model: string;
  datasetSize: number;
  confidenceThreshold: number;
  apiUrl: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    confusionMatrix: ConfusionMatrix;
    avgConfidence: number;
    avgResponseTimeMs: number;
    avgConfidenceByOutcome: {
      truePositive: number;
      falsePositive: number;
      trueNegative: number;
      falseNegative: number;
    };
  };
  predictions: PredictionResult[];
}

function gaugeColor(value: number): string {
  if (value >= 80) return '#22c55e';
  if (value >= 60) return '#eab308';
  return '#ef4444';
}

function statusBadge(status: string): string {
  const isPass = status === 'PASS';
  const bg = isPass ? '#dcfce7' : '#fee2e2';
  const fg = isPass ? '#166534' : '#991b1b';
  const icon = isPass ? '&#10003;' : '&#10007;';
  return `<span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:13px;font-weight:600;background:${bg};color:${fg}">${icon} ${status}</span>`;
}

function pctBar(value: number, max: number): string {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const color = pct === 100 ? '#22c55e' : pct >= 80 ? '#86efac' : '#eab308';
  return `<div style="display:flex;align-items:center;gap:8px">
    <div style="flex:1;background:#e5e7eb;border-radius:4px;height:18px;overflow:hidden">
      <div style="width:${pct}%;background:${color};height:100%;border-radius:4px;transition:width 0.3s"></div>
    </div>
    <span style="font-size:13px;font-weight:600;min-width:70px;text-align:right">${value}/${max}</span>
  </div>`;
}

function coverageGauge(label: string, value: number): string {
  const color = gaugeColor(value);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (value / 100) * circumference;
  return `<div style="text-align:center;width:100px">
    <svg width="84" height="84" viewBox="0 0 84 84">
      <circle cx="42" cy="42" r="36" fill="none" stroke="#e5e7eb" stroke-width="8"/>
      <circle cx="42" cy="42" r="36" fill="none" stroke="${color}" stroke-width="8"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
        stroke-linecap="round" transform="rotate(-90 42 42)"/>
      <text x="42" y="46" text-anchor="middle" font-size="16" font-weight="700" fill="#1f2937">${value}%</text>
    </svg>
    <div style="font-size:12px;color:#6b7280;margin-top:2px">${label}</div>
  </div>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateHtml(evalData: EvalResults | null, llmData: LlmEvalResults | null): string {
  const timestamp = evalData?.timestamp || llmData?.timestamp || new Date().toISOString();
  const allPassed = evalData ? evalData.summary.failed === 0 : true;
  const overallStatus = allPassed ? 'ALL CHECKS PASSED' : `${evalData?.summary.failed ?? 0} CHECKS FAILED`;
  const overallColor = allPassed ? '#22c55e' : '#ef4444';

  let sectionsHtml = '';

  // --- Section 1: Test Suite ---
  if (evalData) {
    const bk = evalData.testCounts.backend;
    const fe = evalData.testCounts.frontend;
    const totalTests = bk.total + fe.total;
    const totalPassed = bk.passed + fe.passed;

    sectionsHtml += `
    <div class="card">
      <h2>Test Suite</h2>
      <div style="display:grid;grid-template-columns:120px 1fr;gap:8px 16px;align-items:center">
        <span style="font-weight:600">Backend</span>
        ${pctBar(bk.passed, bk.total)}
        <span style="font-weight:600">Frontend</span>
        ${pctBar(fe.passed, fe.total)}
        <span style="font-weight:700;color:#374151">Total</span>
        ${pctBar(totalPassed, totalTests)}
      </div>
    </div>`;
  }

  // --- Section 2: Coverage ---
  if (evalData) {
    const beCov = evalData.coverage.backend;
    const feCov = evalData.coverage.frontend;

    sectionsHtml += `
    <div class="card">
      <h2>Code Coverage</h2>
      <h3 style="margin:8px 0 4px;color:#6b7280;font-size:14px">Backend</h3>
      <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
        ${coverageGauge('Statements', beCov.statements)}
        ${coverageGauge('Branches', beCov.branches)}
        ${coverageGauge('Functions', beCov.functions)}
        ${coverageGauge('Lines', beCov.lines)}
      </div>
      <h3 style="margin:16px 0 4px;color:#6b7280;font-size:14px">Frontend</h3>
      <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
        ${coverageGauge('Statements', feCov.statements)}
        ${coverageGauge('Branches', feCov.branches)}
        ${coverageGauge('Functions', feCov.functions)}
        ${coverageGauge('Lines', feCov.lines)}
      </div>
    </div>`;
  }

  // --- Section 3: Quality & Security Checklist ---
  if (evalData) {
    const rows = evalData.checks.map(c => {
      const detailSpan = c.details ? `<span style="color:#6b7280;font-size:12px;margin-left:8px">${escapeHtml(c.details)}</span>` : '';
      return `<tr><td style="padding:6px 12px">${escapeHtml(c.name)}${detailSpan}</td><td style="padding:6px 12px;text-align:center">${statusBadge(c.status)}</td></tr>`;
    }).join('');

    sectionsHtml += `
    <div class="card">
      <h2>Code Quality &amp; Security</h2>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="border-bottom:2px solid #e5e7eb"><th style="text-align:left;padding:6px 12px">Check</th><th style="text-align:center;padding:6px 12px;width:100px">Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  // --- Section 4: LLM Accuracy ---
  if (llmData) {
    const m = llmData.metrics;
    const cm = m.confusionMatrix;

    const metricCard = (label: string, value: number) =>
      `<div style="text-align:center;padding:12px 16px;background:#f9fafb;border-radius:8px;min-width:100px">
        <div style="font-size:28px;font-weight:700;color:${gaugeColor(value * 100)}">${(value * 100).toFixed(1)}%</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">${label}</div>
      </div>`;

    const predRows = llmData.predictions.map(p => {
      const correctBg = p.correct ? '#dcfce7' : '#fee2e2';
      const errorCell = p.error ? `<span style="color:#ef4444">${escapeHtml(p.error)}</span>` : '';
      return `<tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:4px 8px;font-size:13px;font-family:monospace;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(p.commentText)}</td>
        <td style="padding:4px 8px;font-size:13px;text-align:center">${p.category}</td>
        <td style="padding:4px 8px;font-size:13px;text-align:center">${p.expected ? 'Yes' : 'No'}</td>
        <td style="padding:4px 8px;font-size:13px;text-align:center">${p.predicted ? 'Yes' : 'No'}</td>
        <td style="padding:4px 8px;font-size:13px;text-align:center">${(p.confidence * 100).toFixed(0)}%</td>
        <td style="padding:4px 8px;font-size:13px;text-align:center;background:${correctBg}">${p.correct ? '&#10003;' : '&#10007;'}${errorCell}</td>
        <td style="padding:4px 8px;font-size:13px;text-align:right">${p.responseTimeMs}ms</td>
      </tr>`;
    }).join('');

    sectionsHtml += `
    <div class="card">
      <h2>LLM Instruction Detection Accuracy</h2>
      <div style="font-size:13px;color:#6b7280;margin-bottom:12px">
        Model: <strong>${llmData.model}</strong> &nbsp;|&nbsp;
        Dataset: <strong>${llmData.datasetSize}</strong> comments &nbsp;|&nbsp;
        Threshold: <strong>${llmData.confidenceThreshold}</strong> &nbsp;|&nbsp;
        Avg Response: <strong>${m.avgResponseTimeMs}ms</strong>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:20px">
        ${metricCard('Accuracy', m.accuracy)}
        ${metricCard('Precision', m.precision)}
        ${metricCard('Recall', m.recall)}
        ${metricCard('F1 Score', m.f1)}
      </div>

      <h3 style="font-size:14px;color:#374151;margin:16px 0 8px">Confusion Matrix</h3>
      <table style="margin:0 auto;border-collapse:collapse;text-align:center">
        <thead>
          <tr>
            <th style="padding:8px 16px"></th>
            <th style="padding:8px 16px;font-size:12px;color:#6b7280">Predicted: Yes</th>
            <th style="padding:8px 16px;font-size:12px;color:#6b7280">Predicted: No</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:8px 16px;font-weight:600;font-size:12px;color:#6b7280">Actual: Yes</td>
            <td style="padding:12px 24px;background:#dcfce7;font-weight:700;font-size:20px;border-radius:4px">${cm.tp}</td>
            <td style="padding:12px 24px;background:#fee2e2;font-weight:700;font-size:20px;border-radius:4px">${cm.fn}</td>
          </tr>
          <tr>
            <td style="padding:8px 16px;font-weight:600;font-size:12px;color:#6b7280">Actual: No</td>
            <td style="padding:12px 24px;background:#fee2e2;font-weight:700;font-size:20px;border-radius:4px">${cm.fp}</td>
            <td style="padding:12px 24px;background:#dcfce7;font-weight:700;font-size:20px;border-radius:4px">${cm.tn}</td>
          </tr>
        </tbody>
      </table>

      <h3 style="font-size:14px;color:#374151;margin:20px 0 8px">Avg Confidence by Outcome</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:16px">
        <div style="text-align:center;padding:8px 14px;background:#dcfce7;border-radius:6px">
          <div style="font-size:16px;font-weight:700">${(m.avgConfidenceByOutcome.truePositive * 100).toFixed(1)}%</div>
          <div style="font-size:11px;color:#166534">True Positive</div>
        </div>
        <div style="text-align:center;padding:8px 14px;background:#fee2e2;border-radius:6px">
          <div style="font-size:16px;font-weight:700">${(m.avgConfidenceByOutcome.falsePositive * 100).toFixed(1)}%</div>
          <div style="font-size:11px;color:#991b1b">False Positive</div>
        </div>
        <div style="text-align:center;padding:8px 14px;background:#dcfce7;border-radius:6px">
          <div style="font-size:16px;font-weight:700">${(m.avgConfidenceByOutcome.trueNegative * 100).toFixed(1)}%</div>
          <div style="font-size:11px;color:#166534">True Negative</div>
        </div>
        <div style="text-align:center;padding:8px 14px;background:#fee2e2;border-radius:6px">
          <div style="font-size:16px;font-weight:700">${(m.avgConfidenceByOutcome.falseNegative * 100).toFixed(1)}%</div>
          <div style="font-size:11px;color:#991b1b">False Negative</div>
        </div>
      </div>

      <h3 style="font-size:14px;color:#374151;margin:20px 0 8px">Per-Comment Results</h3>
      <div style="overflow-x:auto;max-height:500px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead style="position:sticky;top:0;background:#fff">
            <tr style="border-bottom:2px solid #e5e7eb">
              <th style="padding:6px 8px;text-align:left">Comment</th>
              <th style="padding:6px 8px;text-align:center">Category</th>
              <th style="padding:6px 8px;text-align:center">Expected</th>
              <th style="padding:6px 8px;text-align:center">Predicted</th>
              <th style="padding:6px 8px;text-align:center">Confidence</th>
              <th style="padding:6px 8px;text-align:center">Correct</th>
              <th style="padding:6px 8px;text-align:right">Time</th>
            </tr>
          </thead>
          <tbody>${predRows}</tbody>
        </table>
      </div>
    </div>`;
  }

  // --- No data fallback ---
  if (!evalData && !llmData) {
    sectionsHtml = `<div class="card"><h2>No Data</h2><p>No evaluation results found. Run <code>bash scripts/evaluate.sh</code> and/or <code>npx tsx scripts/run-llm-eval.ts</code> first.</p></div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>InstructScan — Evaluation Dashboard</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#f3f4f6;color:#1f2937;line-height:1.5}
  .container{max-width:960px;margin:0 auto;padding:24px 16px}
  .header{text-align:center;padding:24px 0 16px}
  .header h1{font-size:24px;font-weight:700;margin-bottom:4px}
  .header .ts{font-size:13px;color:#6b7280}
  .badge{display:inline-block;padding:4px 14px;border-radius:6px;font-size:14px;font-weight:700;margin-top:8px}
  .card{background:#fff;border-radius:10px;padding:20px 24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .card h2{font-size:17px;font-weight:700;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e5e7eb}
  table{font-size:14px}
  th{font-weight:600;color:#374151}
  tr:nth-child(even){background:#f9fafb}
  @media print{body{background:#fff}.card{box-shadow:none;border:1px solid #e5e7eb}}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>InstructScan Evaluation Dashboard</h1>
    <div class="ts">${timestamp}</div>
    <div class="badge" style="background:${allPassed ? '#dcfce7' : '#fee2e2'};color:${allPassed ? '#166534' : '#991b1b'}">${overallStatus}</div>
  </div>
  ${sectionsHtml}
  <div style="text-align:center;padding:16px 0;font-size:12px;color:#9ca3af">
    Generated by InstructScan Evaluation Suite
  </div>
</div>
</body>
</html>`;
}

function main() {
  mkdirSync(REPORTS_DIR, { recursive: true });

  const evalPath = resolve(REPORTS_DIR, 'eval-results.json');
  const llmPath = resolve(REPORTS_DIR, 'llm-eval-results.json');

  let evalData: EvalResults | null = null;
  let llmData: LlmEvalResults | null = null;

  if (existsSync(evalPath)) {
    evalData = JSON.parse(readFileSync(evalPath, 'utf-8'));
    console.log('Loaded eval-results.json');
  } else {
    console.log('WARN: eval-results.json not found — skipping test/quality sections');
  }

  if (existsSync(llmPath)) {
    llmData = JSON.parse(readFileSync(llmPath, 'utf-8'));
    console.log('Loaded llm-eval-results.json');
  } else {
    console.log('WARN: llm-eval-results.json not found — skipping LLM accuracy section');
  }

  const html = generateHtml(evalData, llmData);
  const outPath = resolve(REPORTS_DIR, 'dashboard.html');
  writeFileSync(outPath, html);
  console.log(`Dashboard written to: ${outPath}`);
}

main();
