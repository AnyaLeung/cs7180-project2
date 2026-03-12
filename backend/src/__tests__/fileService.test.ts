import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  upload,
  listByUserId,
  deleteById,
  BadRequestError,
} from '../services/fileService';

const mockStorageUpload = vi.hoisted(() => vi.fn());
const mockStorageRemove = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        remove: mockStorageRemove,
      }),
    },
    from: mockFrom,
  },
}));

describe('fileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageUpload.mockResolvedValue({ error: null });
    mockStorageRemove.mockResolvedValue(undefined);
  });

  describe('upload', () => {
    const validFile = {
      buffer: Buffer.from('# test'),
      originalname: 'script.py',
      size: 100,
    };

    it('throws BadRequestError for non-.py filename', async () => {
      await expect(
        upload('user-1', { ...validFile, originalname: 'readme.txt' })
      ).rejects.toThrow(BadRequestError);
      await expect(
        upload('user-1', { ...validFile, originalname: 'readme.txt' })
      ).rejects.toThrow(/\.py/i);
      expect(mockStorageUpload).not.toHaveBeenCalled();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('throws BadRequestError when file size exceeds 5MB', async () => {
      const overLimit = 5 * 1024 * 1024 + 1;
      await expect(
        upload('user-1', { ...validFile, size: overLimit })
      ).rejects.toThrow(BadRequestError);
      await expect(
        upload('user-1', { ...validFile, size: overLimit })
      ).rejects.toThrow(/5MB/i);
      expect(mockStorageUpload).not.toHaveBeenCalled();
    });

    it('uploads to storage and inserts into files, returns camelCase', async () => {
      const dbRow = {
        id: 'file-uuid-1',
        filename: 'script.py',
        storage_path: 'user-1/file-uuid-1.py',
        size_bytes: 100,
        uploaded_at: '2026-01-01T00:00:00.000Z',
      };
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: dbRow, error: null }),
        }),
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'files') {
          return { insert: mockInsert };
        }
        return {};
      });

      const result = await upload('user-1', validFile);

      expect(mockStorageUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-1\/[a-f0-9-]+\.py$/),
        validFile.buffer,
        { contentType: 'text/x-python', upsert: false }
      );
      expect(mockInsert).toHaveBeenCalled();
      expect(result).toEqual({
        id: dbRow.id,
        filename: dbRow.filename,
        storagePath: dbRow.storage_path,
        sizeBytes: dbRow.size_bytes,
        uploadedAt: dbRow.uploaded_at,
      });
    });

    it('throws when storage upload returns error', async () => {
      mockStorageUpload.mockResolvedValueOnce({ error: new Error('Storage failed') });
      mockFrom.mockReturnValue({ insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) });

      await expect(upload('user-1', validFile)).rejects.toThrow('Storage failed');
    });
  });

  describe('listByUserId', () => {
    it('returns only example files when no user files in DB', async () => {
      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await listByUserId('user-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'example-1', filename: 'analysis_plan.py' });
      expect(result[1]).toMatchObject({ id: 'example-2', filename: 'data_cleaning.py' });
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('returns example files followed by user files in camelCase', async () => {
      const rows = [
        {
          id: 'f1',
          filename: 'a.py',
          storage_path: 'user-1/f1.py',
          size_bytes: 10,
          uploaded_at: '2026-01-01T00:00:00.000Z',
        },
      ];
      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: rows, error: null }),
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await listByUserId('user-1');

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ id: 'example-1' });
      expect(result[1]).toMatchObject({ id: 'example-2' });
      expect(result[2]).toEqual({
        id: 'f1',
        filename: 'a.py',
        storagePath: 'user-1/f1.py',
        sizeBytes: 10,
        uploadedAt: '2026-01-01T00:00:00.000Z',
      });
    });
  });

  describe('deleteById', () => {
    it('returns not_found when file does not exist', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await deleteById('missing-id', 'user-1');

      expect(result).toBe('not_found');
      expect(mockStorageRemove).not.toHaveBeenCalled();
    });

    it('returns forbidden when file belongs to another user', async () => {
      const row = {
        id: 'f1',
        user_id: 'other-user',
        storage_path: 'other-user/f1.py',
      };
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
          }),
        }),
      });

      const result = await deleteById('f1', 'user-1');

      expect(result).toBe('forbidden');
      expect(mockStorageRemove).not.toHaveBeenCalled();
    });

    it('removes from storage and deletes from DB, returns ok', async () => {
      const row = {
        id: 'f1',
        user_id: 'user-1',
        storage_path: 'user-1/f1.py',
      };
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
      const mockEqId = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'files') {
          return { select: mockSelect, delete: mockDelete };
        }
        return {};
      });

      const result = await deleteById('f1', 'user-1');

      expect(result).toBe('ok');
      expect(mockStorageRemove).toHaveBeenCalledWith(['user-1/f1.py']);
      expect(mockDelete).toHaveBeenCalled();
      expect(mockDeleteEq).toHaveBeenCalledWith('id', 'f1');
    });
  });
});
