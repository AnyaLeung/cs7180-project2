import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import * as scanController from '../controllers/scanController';
import * as scanService from '../services/scanService';

vi.mock('../services/supabaseClient', () => ({
  supabase: {},
}));
vi.mock('../services/scanService');

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    userId: 'user-1',
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
  res.setHeader = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('scanController.scanFile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when userId is missing', async () => {
    const req = mockReq({ userId: undefined });
    const res = mockRes();
    await scanController.scanFile(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when fileId is missing', async () => {
    const req = mockReq({ params: {} });
    const res = mockRes();
    await scanController.scanFile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when file not found', async () => {
    vi.mocked(scanService.runScan).mockResolvedValue('not_found');
    const req = mockReq({ params: { id: 'missing' } });
    const res = mockRes();
    await scanController.scanFile(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when forbidden', async () => {
    vi.mocked(scanService.runScan).mockResolvedValue('forbidden');
    const req = mockReq({ params: { id: 'other' } });
    const res = mockRes();
    await scanController.scanFile(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 200 with scan result on success', async () => {
    const result: scanService.ScanResult = {
      scanId: 's1',
      instructions: [],
      instructionCount: 0,
      scannedAt: '2026-01-01',
    };
    vi.mocked(scanService.runScan).mockResolvedValue(result);
    const req = mockReq({ params: { id: 'f1' } });
    const res = mockRes();
    await scanController.scanFile(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      scanId: 's1',
      instructions: [],
      instructionCount: 0,
      scannedAt: '2026-01-01',
    });
  });
});

describe('scanController.listScans', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when userId is missing', async () => {
    const req = mockReq({ userId: undefined });
    const res = mockRes();
    await scanController.listScans(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when fileId is missing', async () => {
    const req = mockReq({ params: {} });
    const res = mockRes();
    await scanController.listScans(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when file not found', async () => {
    vi.mocked(scanService.listScansByFileId).mockResolvedValue('not_found');
    const req = mockReq({ params: { id: 'missing' } });
    const res = mockRes();
    await scanController.listScans(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when forbidden', async () => {
    vi.mocked(scanService.listScansByFileId).mockResolvedValue('forbidden');
    const req = mockReq({ params: { id: 'other' } });
    const res = mockRes();
    await scanController.listScans(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 200 with camelCase scan list', async () => {
    const scans: scanService.ScanListItem[] = [
      { id: 's1', fileId: 'f1', scannedAt: '2026-01-01', instructionCount: 3, resultPath: 'path/s1.txt' },
    ];
    vi.mocked(scanService.listScansByFileId).mockResolvedValue(scans);
    const req = mockReq({ params: { id: 'f1' } });
    const res = mockRes();
    await scanController.listScans(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      { id: 's1', fileId: 'f1', scannedAt: '2026-01-01', instructionCount: 3, resultPath: 'path/s1.txt' },
    ]);
  });
});

describe('scanController.downloadScan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when userId is missing', async () => {
    const req = mockReq({ userId: undefined });
    const res = mockRes();
    await scanController.downloadScan(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when scanId is missing', async () => {
    const req = mockReq({ params: {} });
    const res = mockRes();
    await scanController.downloadScan(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when scan not found', async () => {
    vi.mocked(scanService.getScanDownload).mockResolvedValue('not_found');
    const req = mockReq({ params: { id: 'missing' } });
    const res = mockRes();
    await scanController.downloadScan(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when forbidden', async () => {
    vi.mocked(scanService.getScanDownload).mockResolvedValue('forbidden');
    const req = mockReq({ params: { id: 'other' } });
    const res = mockRes();
    await scanController.downloadScan(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns text file with content-disposition on success', async () => {
    vi.mocked(scanService.getScanDownload).mockResolvedValue({
      content: 'Scan result: test.py\nInstructions:\n(none)\n',
      filename: 'scan-s1.txt',
    });
    const req = mockReq({ params: { id: 's1' } });
    const res = mockRes();
    await scanController.downloadScan(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="scan-s1.txt"');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Scan result'));
  });
});
