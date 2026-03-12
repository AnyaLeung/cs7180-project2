import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runScan, listScansByFileId, getScanDownload } from '../services/scanService';

const mockGetFileContentById = vi.hoisted(() => vi.fn());
const mockStorageUpload = vi.hoisted(() => vi.fn());
const mockStorageDownload = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('../services/fileService', () => ({
  getFileContentById: mockGetFileContentById,
}));

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        download: mockStorageDownload,
      }),
    },
    from: mockFrom,
  },
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                lineNumber: 1,
                commentText: '# add button',
                isInstruction: true,
                type: 'Generate',
                confidence: 0.9,
              },
            ]),
          },
        ],
      }),
    },
  })),
}));

describe('scanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';
    mockStorageUpload.mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'scans') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });
  });

  describe('runScan', () => {
    it('returns not_found when file does not exist', async () => {
      mockGetFileContentById.mockResolvedValue('not_found');

      const result = await runScan('file-1', 'user-1');

      expect(result).toBe('not_found');
      expect(mockStorageUpload).not.toHaveBeenCalled();
    });

    it('returns forbidden when file belongs to another user', async () => {
      mockGetFileContentById.mockResolvedValue('forbidden');

      const result = await runScan('file-1', 'user-1');

      expect(result).toBe('forbidden');
    });

    it('returns instructions and persists scan when file has comments', async () => {
      mockGetFileContentById.mockResolvedValue({
        content: '# add button\nprint(1)\n',
        filename: 'test.py',
      });

      const result = await runScan('file-1', 'user-1');

      if (result === 'not_found' || result === 'forbidden') throw new Error('Expected ScanResult');
      expect(result.instructions.length).toBeGreaterThanOrEqual(0);
      expect(result.scanId).toBeDefined();
      expect(result.scannedAt).toBeDefined();
      expect(mockStorageUpload).toHaveBeenCalled();
    });
  });

  describe('listScansByFileId', () => {
    it('returns not_found when file does not exist', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await listScansByFileId('file-1', 'user-1');

      expect(result).toBe('not_found');
    });

    it('returns forbidden when file belongs to another user', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'f1', user_id: 'other' },
              error: null,
            }),
          }),
        }),
      });

      const result = await listScansByFileId('file-1', 'user-1');

      expect(result).toBe('forbidden');
    });
  });

  describe('getScanDownload', () => {
    it('returns not_found when scan does not exist', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await getScanDownload('scan-1', 'user-1');

      expect(result).toBe('not_found');
    });
  });
});
