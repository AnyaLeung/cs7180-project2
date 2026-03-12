/**
 * LLM Instruction Detection Benchmark
 *
 * Runs a labeled dataset of Python comments through the scan-line API,
 * measures classification accuracy, and writes results to reports/llm-eval-results.json.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/run-llm-eval.ts
 *
 * Environment:
 *   EVAL_API_URL  — base URL of the scan-line API (default: http://localhost:3002)
 *   ANTHROPIC_API_KEY — required if calling through a local dev server
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BenchmarkItem {
  commentText: string;
  expectedIsInstruction: boolean;
  category: string;
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

interface ConfusionMatrix {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

interface EvalMetrics {
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
}

interface LlmEvalResults {
  timestamp: string;
  model: string;
  datasetSize: number;
  confidenceThreshold: number;
  apiUrl: string;
  metrics: EvalMetrics;
  predictions: PredictionResult[];
}

const API_URL = process.env.EVAL_API_URL || 'http://localhost:3002';
const CONFIDENCE_THRESHOLD = 0.6;
const CONCURRENCY = 3;

async function callScanLine(commentText: string): Promise<{ isInstruction: boolean; confidence: number }> {
  const resp = await fetch(`${API_URL}/api/scan-line`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commentText }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API returned ${resp.status}: ${text}`);
  }

  return resp.json() as Promise<{ isInstruction: boolean; confidence: number }>;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function computeMetrics(predictions: PredictionResult[]): EvalMetrics {
  const cm: ConfusionMatrix = { tp: 0, fp: 0, tn: 0, fn: 0 };
  const confidences = { tp: [] as number[], fp: [] as number[], tn: [] as number[], fn: [] as number[] };

  for (const p of predictions) {
    if (p.error) continue;
    if (p.expected && p.predicted) {
      cm.tp++;
      confidences.tp.push(p.confidence);
    } else if (!p.expected && p.predicted) {
      cm.fp++;
      confidences.fp.push(p.confidence);
    } else if (!p.expected && !p.predicted) {
      cm.tn++;
      confidences.tn.push(p.confidence);
    } else {
      cm.fn++;
      confidences.fn.push(p.confidence);
    }
  }

  const total = cm.tp + cm.fp + cm.tn + cm.fn;
  const accuracy = total > 0 ? (cm.tp + cm.tn) / total : 0;
  const precision = (cm.tp + cm.fp) > 0 ? cm.tp / (cm.tp + cm.fp) : 0;
  const recall = (cm.tp + cm.fn) > 0 ? cm.tp / (cm.tp + cm.fn) : 0;
  const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;

  const validPredictions = predictions.filter(p => !p.error);

  return {
    accuracy: Math.round(accuracy * 10000) / 10000,
    precision: Math.round(precision * 10000) / 10000,
    recall: Math.round(recall * 10000) / 10000,
    f1: Math.round(f1 * 10000) / 10000,
    confusionMatrix: cm,
    avgConfidence: Math.round(avg(validPredictions.map(p => p.confidence)) * 10000) / 10000,
    avgResponseTimeMs: Math.round(avg(validPredictions.map(p => p.responseTimeMs))),
    avgConfidenceByOutcome: {
      truePositive: Math.round(avg(confidences.tp) * 10000) / 10000,
      falsePositive: Math.round(avg(confidences.fp) * 10000) / 10000,
      trueNegative: Math.round(avg(confidences.tn) * 10000) / 10000,
      falseNegative: Math.round(avg(confidences.fn) * 10000) / 10000,
    },
  };
}

async function runBatch(items: BenchmarkItem[], batchSize: number): Promise<PredictionResult[]> {
  const results: PredictionResult[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (item): Promise<PredictionResult> => {
        const start = performance.now();
        try {
          const response = await callScanLine(item.commentText);
          const elapsed = Math.round(performance.now() - start);
          const predicted = response.isInstruction && response.confidence >= CONFIDENCE_THRESHOLD;
          return {
            commentText: item.commentText,
            category: item.category,
            expected: item.expectedIsInstruction,
            predicted,
            confidence: response.confidence,
            correct: predicted === item.expectedIsInstruction,
            responseTimeMs: elapsed,
            error: null,
          };
        } catch (err) {
          const elapsed = Math.round(performance.now() - start);
          return {
            commentText: item.commentText,
            category: item.category,
            expected: item.expectedIsInstruction,
            predicted: false,
            confidence: 0,
            correct: false,
            responseTimeMs: elapsed,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      })
    );
    results.push(...batchResults);
    const done = Math.min(i + batchSize, items.length);
    process.stdout.write(`  Progress: ${done}/${items.length} comments evaluated\r`);
  }
  console.log();
  return results;
}

async function main() {
  console.log('InstructScan LLM Benchmark');
  console.log('=========================');
  console.log(`API URL: ${API_URL}`);
  console.log(`Confidence threshold: ${CONFIDENCE_THRESHOLD}`);
  console.log();

  const datasetPath = resolve(__dirname, 'benchmark-dataset.json');
  const dataset: BenchmarkItem[] = JSON.parse(readFileSync(datasetPath, 'utf-8'));
  console.log(`Loaded ${dataset.length} benchmark items`);
  console.log(`  Instructions: ${dataset.filter(d => d.expectedIsInstruction).length}`);
  console.log(`  Non-instructions: ${dataset.filter(d => !d.expectedIsInstruction).length}`);
  console.log();

  console.log('Running benchmark...');
  const predictions = await runBatch(dataset, CONCURRENCY);

  const errors = predictions.filter(p => p.error);
  if (errors.length > 0) {
    console.log(`\nWARNING: ${errors.length} API errors encountered:`);
    for (const e of errors) {
      console.log(`  - "${e.commentText}": ${e.error}`);
    }
    console.log();
  }

  const metrics = computeMetrics(predictions);

  console.log('Results:');
  console.log(`  Accuracy:  ${(metrics.accuracy * 100).toFixed(1)}%`);
  console.log(`  Precision: ${(metrics.precision * 100).toFixed(1)}%`);
  console.log(`  Recall:    ${(metrics.recall * 100).toFixed(1)}%`);
  console.log(`  F1 Score:  ${(metrics.f1 * 100).toFixed(1)}%`);
  console.log(`  Avg Confidence: ${(metrics.avgConfidence * 100).toFixed(1)}%`);
  console.log(`  Avg Response Time: ${metrics.avgResponseTimeMs}ms`);
  console.log();
  console.log('Confusion Matrix:');
  console.log(`  TP=${metrics.confusionMatrix.tp}  FP=${metrics.confusionMatrix.fp}`);
  console.log(`  FN=${metrics.confusionMatrix.fn}  TN=${metrics.confusionMatrix.tn}`);

  const reportsDir = resolve(__dirname, '..', 'reports');
  mkdirSync(reportsDir, { recursive: true });

  const results: LlmEvalResults = {
    timestamp: new Date().toISOString(),
    model: 'claude-sonnet-4-6',
    datasetSize: dataset.length,
    confidenceThreshold: CONFIDENCE_THRESHOLD,
    apiUrl: API_URL,
    metrics,
    predictions,
  };

  const outPath = resolve(reportsDir, 'llm-eval-results.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nResults written to: ${outPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
