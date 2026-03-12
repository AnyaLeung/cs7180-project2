import { api } from '../utils/api';

export type InstructionAction = 'write-code' | 'detail-plan' | 'alternative-plan';

interface ScanLineResponse {
  isInstruction: boolean;
  confidence: number;
}

interface GenerateResponse {
  generatedText: string;
}

const cache = new Map<string, boolean>();

export async function detectInstruction(commentText: string): Promise<boolean> {
  const trimmed = commentText.trim();
  if (!trimmed.startsWith('#')) return false;

  if (cache.has(trimmed)) return cache.get(trimmed)!;

  try {
    const res = await api.post<ScanLineResponse>('/api/scan-line', { commentText: trimmed });
    const result = res.isInstruction && res.confidence >= 0.6;
    cache.set(trimmed, result);
    return result;
  } catch {
    return mockDetect(trimmed);
  }
}

function mockDetect(text: string): boolean {
  const lower = text.toLowerCase();
  const instructionPatterns = [
    /step\s*\d/,
    /todo/,
    /load\s+data/,
    /clean/,
    /filter/,
    /merge/,
    /plot/,
    /train/,
    /split/,
    /import/,
    /create/,
    /build/,
    /compute/,
    /calculate/,
    /transform/,
    /process/,
    /analyze/,
    /visualize/,
    /export/,
    /save/,
    /read/,
    /write/,
    /generate/,
    /implement/,
  ];
  const result = instructionPatterns.some((p) => p.test(lower));
  cache.set(text.trim(), result);
  return result;
}

export async function generateContent(
  commentText: string,
  action: InstructionAction,
  fileContent: string
): Promise<string> {
  try {
    const res = await api.post<GenerateResponse>('/api/generate', {
      commentText,
      action,
      fileContent,
    });
    return res.generatedText;
  } catch {
    return mockGenerate(commentText, action);
  }
}

function mockGenerate(commentText: string, action: InstructionAction): string {
  const clean = commentText.replace(/^#\s*/, '').trim();

  switch (action) {
    case 'write-code':
      return `\n# Generated code for: ${clean}\nimport pandas as pd\n\n# TODO: implement ${clean}\npass\n`;
    case 'detail-plan':
      return `\n# Detailed plan for: ${clean}\n# 1. Prepare the environment\n# 2. Execute the main logic\n# 3. Validate the results\n# 4. Handle edge cases\n`;
    case 'alternative-plan':
      return `\n# Alternative approach for: ${clean}\n# Instead of the above, consider:\n# - Using a different library or method\n# - Breaking this into smaller steps\n# - Adding error handling first\n`;
  }
}

export function clearDetectionCache() {
  cache.clear();
}
