import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from './supabaseClient';
import { getFileContentById } from './fileService';
import { parseCommentLines } from './commentParser';

const BUCKET = 'python-files';
const SCAN_RESULTS_PREFIX = 'scan-results/';
const MODEL = 'claude-sonnet-4-6';
const CONFIDENCE_THRESHOLD = 0.6;
const RETENTION_DAYS = 30;

export interface InstructionItem {
  lineNumber: number;
  commentText: string;
  isInstruction: boolean;
  type: 'Run' | 'Modify' | 'Delete' | 'Generate' | 'Other' | null;
  confidence: number;
}

export interface ScanResult {
  scanId: string;
  instructions: InstructionItem[];
  instructionCount: number;
  scannedAt: string;
}

function buildClassificationPrompt(comments: { lineNumber: number; commentText: string }[]): string {
  const list = comments
    .map((c) => `Line ${c.lineNumber}: ${c.commentText}`)
    .join('\n');
  return `You are classifying Python comment lines as instruction vs non-instruction for a code editor.

For each comment below, decide:
1. isInstruction: true if it expresses an intent to do something (run, modify, delete, generate, or other action); false if it's just a note, docstring, or explanation.
2. type: one of Run, Modify, Delete, Generate, Other if isInstruction is true; null otherwise.
3. confidence: number between 0 and 1.

Comments (one per line with "Line N: ..."):
${list}

Respond with a JSON array only, no markdown or explanation. Each element must have: lineNumber (number), commentText (string), isInstruction (boolean), type (string or null), confidence (number).
Example: [{"lineNumber":12,"commentText":"# add button","isInstruction":true,"type":"Generate","confidence":0.9}]`;
}

async function callClaudeForClassification(
  comments: { lineNumber: number; commentText: string }[]
): Promise<InstructionItem[]> {
  if (comments.length === 0) return [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const client = new Anthropic({ apiKey });
  const prompt = buildClassificationPrompt(comments);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text in Claude response');

  let raw = textBlock.text.trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (jsonMatch) raw = jsonMatch[0];

  const parsed = JSON.parse(raw) as InstructionItem[];
  if (!Array.isArray(parsed)) throw new Error('Claude did not return an array');

  return parsed;
}

function filterByConfidence(items: InstructionItem[]): InstructionItem[] {
  return items.filter((i) => i.confidence >= CONFIDENCE_THRESHOLD);
}

function buildResultTxt(filename: string, scannedAt: string, instructions: InstructionItem[]): string {
  const header = `Scan result: ${filename}\nScanned at: ${scannedAt}\n\nInstructions:\n`;
  const lines = instructions.map((ins, idx) => `${idx + 1}. Line ${ins.lineNumber}: ${ins.commentText} [${ins.type ?? 'N/A'}]`);
  return header + (lines.length ? lines.join('\n') : '(none)') + '\n';
}

export async function runScan(
  fileId: string,
  userId: string
): Promise<ScanResult | 'not_found' | 'forbidden'> {
  const fileResult = await getFileContentById(fileId, userId);
  if (fileResult === 'not_found') return 'not_found';
  if (fileResult === 'forbidden') return 'forbidden';

  const { content, filename } = fileResult;
  const commentLines = parseCommentLines(content);

  let instructions: InstructionItem[] = [];
  if (commentLines.length > 0) {
    const classified = await callClaudeForClassification(commentLines);
    instructions = filterByConfidence(classified);
  }

  const scanId = randomUUID();
  const scannedAt = new Date().toISOString();
  const resultPath = `${SCAN_RESULTS_PREFIX}${scanId}.txt`;
  const txtContent = buildResultTxt(filename, scannedAt, instructions);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(resultPath, Buffer.from(txtContent, 'utf-8'), {
      contentType: 'text/plain',
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + RETENTION_DAYS);

  const { error: insertError } = await supabase.from('scans').insert({
    id: scanId,
    file_id: fileId,
    result_path: resultPath,
    instruction_count: instructions.length,
    expires_at: expiresAt.toISOString(),
  });
  if (insertError) throw insertError;

  return {
    scanId,
    instructions,
    instructionCount: instructions.length,
    scannedAt,
  };
}

export interface ScanListItem {
  id: string;
  fileId: string;
  scannedAt: string;
  instructionCount: number;
  resultPath: string;
}

export async function listScansByFileId(
  fileId: string,
  userId: string
): Promise<ScanListItem[] | 'not_found' | 'forbidden'> {
  const { data: fileRow, error: fileError } = await supabase
    .from('files')
    .select('id, user_id')
    .eq('id', fileId)
    .maybeSingle();
  if (fileError) throw fileError;
  if (!fileRow) return 'not_found';
  if ((fileRow as { user_id: string }).user_id !== userId) return 'forbidden';

  const { data: rows, error } = await supabase
    .from('scans')
    .select('id, file_id, scanned_at, instruction_count, result_path')
    .eq('file_id', fileId)
    .order('scanned_at', { ascending: false });
  if (error) throw error;

  return (rows ?? []).map((r) => ({
    id: (r as { id: string }).id,
    fileId: (r as { file_id: string }).file_id,
    scannedAt: (r as { scanned_at: string }).scanned_at,
    instructionCount: (r as { instruction_count: number }).instruction_count,
    resultPath: (r as { result_path: string }).result_path,
  }));
}

export async function getScanDownload(
  scanId: string,
  userId: string
): Promise<{ content: string; filename: string } | 'not_found' | 'forbidden'> {
  const { data: scanRow, error: scanError } = await supabase
    .from('scans')
    .select('file_id, result_path')
    .eq('id', scanId)
    .maybeSingle();
  if (scanError) throw scanError;
  if (!scanRow) return 'not_found';

  const fileId = (scanRow as { file_id: string }).file_id;
  const { data: fileRow, error: fileError } = await supabase
    .from('files')
    .select('user_id, filename')
    .eq('id', fileId)
    .maybeSingle();
  if (fileError) throw fileError;
  if (!fileRow || (fileRow as { user_id: string }).user_id !== userId) return 'forbidden';

  const resultPath = (scanRow as { result_path: string }).result_path;
  const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(resultPath);
  if (downloadError) throw downloadError;
  if (!blob) throw new Error('Download returned no data');

  const content = await blob.text();
  const filename = `scan-${scanId}.txt`;
  return { content, filename };
}
