import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectInstruction, generateContent, clearDetectionCache } from '../../hooks/useInstructionDetect';

vi.mock('../../utils/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

import { api } from '../../utils/api';
const mockPost = vi.mocked(api.post);

describe('detectInstruction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDetectionCache();
  });

  it('returns false for non-comment text', async () => {
    const result = await detectInstruction('print("hello")');
    expect(result).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('calls API for comment text and returns true when instruction', async () => {
    mockPost.mockResolvedValueOnce({ isInstruction: true, confidence: 0.9 });
    const result = await detectInstruction('# Step 1: Load data');
    expect(result).toBe(true);
    expect(mockPost).toHaveBeenCalledWith('/api/scan-line', { commentText: '# Step 1: Load data' });
  });

  it('returns false when confidence < 0.6', async () => {
    mockPost.mockResolvedValueOnce({ isInstruction: true, confidence: 0.4 });
    const result = await detectInstruction('# maybe instruction');
    expect(result).toBe(false);
  });

  it('returns false when isInstruction is false', async () => {
    mockPost.mockResolvedValueOnce({ isInstruction: false, confidence: 0.9 });
    const result = await detectInstruction('# Author: demo user');
    expect(result).toBe(false);
  });

  it('caches results and avoids repeat API calls', async () => {
    mockPost.mockResolvedValueOnce({ isInstruction: true, confidence: 0.9 });
    await detectInstruction('# Step 1: Load data');
    await detectInstruction('# Step 1: Load data');
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('falls back to mock detection on API error', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'));
    const result = await detectInstruction('# Step 1: Load data');
    expect(result).toBe(true);
  });
});

describe('generateContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls API with write-code action', async () => {
    mockPost.mockResolvedValueOnce({ generatedText: 'import pandas as pd\n' });
    const result = await generateContent('# Load data', 'write-code', '# file content');
    expect(mockPost).toHaveBeenCalledWith('/api/generate', {
      commentText: '# Load data',
      action: 'write-code',
      fileContent: '# file content',
    });
    expect(result).toBe('import pandas as pd\n');
  });

  it('calls API with detail-plan action', async () => {
    mockPost.mockResolvedValueOnce({ generatedText: '# sub-step\n' });
    const result = await generateContent('# Clean data', 'detail-plan', '# ctx');
    expect(result).toBe('# sub-step\n');
  });

  it('calls API with alternative-plan action', async () => {
    mockPost.mockResolvedValueOnce({ generatedText: '# alternative\n' });
    const result = await generateContent('# Filter', 'alternative-plan', '# ctx');
    expect(result).toBe('# alternative\n');
  });

  it('falls back to mock generation on API error', async () => {
    mockPost.mockRejectedValueOnce(new Error('API down'));
    const result = await generateContent('# Load data', 'write-code', '');
    expect(result).toContain('Generated code for');
  });
});
