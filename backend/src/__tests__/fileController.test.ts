import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import * as fileController from '../controllers/fileController';
import * as fileService from '../services/fileService';

vi.mock('../services/supabaseClient', () => ({
  supabase: {},
}));

vi.mock('../services/fileService', async () => {
  class BadRequestError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'BadRequestError';
    }
  }
  return {
    upload: vi.fn(),
    listByUserId: vi.fn(),
    deleteById: vi.fn(),
    getFileContentById: vi.fn(),
    BadRequestError,
  };
});

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    userId: 'user-1',
    file: undefined,
    params: {},
    body: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('fileController.upload', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when userId is missing', async () => {
    const req = mockReq({ userId: undefined });
    const res = mockRes();
    await fileController.upload(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  it('returns 400 when no file is provided', async () => {
    const req = mockReq({ file: undefined });
    const res = mockRes();
    await fileController.upload(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'No file uploaded' });
  });

  it('returns 201 with result on successful upload', async () => {
    const fakeResult = { id: 'f1', filename: 'test.py', storagePath: 'u/f1.py', sizeBytes: 50, uploadedAt: '2026-01-01' };
    vi.mocked(fileService.upload).mockResolvedValue(fakeResult);

    const req = mockReq({
      file: { buffer: Buffer.from('x'), originalname: 'test.py', size: 50 } as Express.Multer.File,
    });
    const res = mockRes();
    await fileController.upload(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(fakeResult);
  });

  it('returns 400 when fileService throws BadRequestError', async () => {
    vi.mocked(fileService.upload).mockRejectedValue(new fileService.BadRequestError('Only .py'));

    const req = mockReq({
      file: { buffer: Buffer.from('x'), originalname: 'test.txt', size: 10 } as Express.Multer.File,
    });
    const res = mockRes();
    await fileController.upload(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Only .py' });
  });

  it('re-throws non-BadRequestError errors', async () => {
    vi.mocked(fileService.upload).mockRejectedValue(new Error('db crash'));

    const req = mockReq({
      file: { buffer: Buffer.from('x'), originalname: 'a.py', size: 10 } as Express.Multer.File,
    });
    const res = mockRes();
    await expect(fileController.upload(req, res)).rejects.toThrow('db crash');
  });
});

describe('fileController.list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when userId is missing', async () => {
    const req = mockReq({ userId: undefined });
    const res = mockRes();
    await fileController.list(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 200 with file list', async () => {
    const files = [{ id: 'f1', filename: 'a.py', storagePath: 'p', sizeBytes: 10, uploadedAt: 'now' }];
    vi.mocked(fileService.listByUserId).mockResolvedValue(files);

    const req = mockReq();
    const res = mockRes();
    await fileController.list(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(files);
  });
});

describe('fileController.deleteFile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when userId is missing', async () => {
    const req = mockReq({ userId: undefined });
    const res = mockRes();
    await fileController.deleteFile(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when fileId is missing', async () => {
    const req = mockReq({ params: {} });
    const res = mockRes();
    await fileController.deleteFile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when file not found', async () => {
    vi.mocked(fileService.deleteById).mockResolvedValue('not_found');
    const req = mockReq({ params: { id: 'nonexistent' } });
    const res = mockRes();
    await fileController.deleteFile(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when forbidden', async () => {
    vi.mocked(fileService.deleteById).mockResolvedValue('forbidden');
    const req = mockReq({ params: { id: 'other-user-file' } });
    const res = mockRes();
    await fileController.deleteFile(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 204 on successful delete', async () => {
    vi.mocked(fileService.deleteById).mockResolvedValue('ok');
    const req = mockReq({ params: { id: 'f1' } });
    const res = mockRes();
    await fileController.deleteFile(req, res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('fileController.getContent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when userId is missing', async () => {
    const req = mockReq({ userId: undefined });
    const res = mockRes();
    await fileController.getContent(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when fileId is missing', async () => {
    const req = mockReq({ params: {} });
    const res = mockRes();
    await fileController.getContent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when file not found', async () => {
    vi.mocked(fileService.getFileContentById).mockResolvedValue('not_found');
    const req = mockReq({ params: { id: 'missing' } });
    const res = mockRes();
    await fileController.getContent(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when forbidden', async () => {
    vi.mocked(fileService.getFileContentById).mockResolvedValue('forbidden');
    const req = mockReq({ params: { id: 'other-file' } });
    const res = mockRes();
    await fileController.getContent(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 200 with content on success', async () => {
    vi.mocked(fileService.getFileContentById).mockResolvedValue({ content: '# hello', filename: 'test.py' });
    const req = mockReq({ params: { id: 'f1' } });
    const res = mockRes();
    await fileController.getContent(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ content: '# hello' });
  });
});
