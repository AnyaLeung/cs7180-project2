import { Request, Response } from 'express';
import * as scanService from '../services/scanService';

export async function scanFile(req: Request, res: Response): Promise<void> {
  const userId = req.userId;
  const fileId = req.params.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  if (!fileId) {
    res.status(400).json({ message: 'File id is required' });
    return;
  }

  const result = await scanService.runScan(fileId, userId);
  if (result === 'not_found') {
    res.status(404).json({ message: 'File not found' });
    return;
  }
  if (result === 'forbidden') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  res.status(200).json({
    scanId: result.scanId,
    instructions: result.instructions,
    instructionCount: result.instructionCount,
    scannedAt: result.scannedAt,
  });
}

export async function listScans(req: Request, res: Response): Promise<void> {
  const userId = req.userId;
  const fileId = req.params.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  if (!fileId) {
    res.status(400).json({ message: 'File id is required' });
    return;
  }

  const result = await scanService.listScansByFileId(fileId, userId);
  if (result === 'not_found') {
    res.status(404).json({ message: 'File not found' });
    return;
  }
  if (result === 'forbidden') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const camelCase = result.map((s) => ({
    id: s.id,
    fileId: s.fileId,
    scannedAt: s.scannedAt,
    instructionCount: s.instructionCount,
    resultPath: s.resultPath,
  }));
  res.status(200).json(camelCase);
}

export async function downloadScan(req: Request, res: Response): Promise<void> {
  const userId = req.userId;
  const scanId = req.params.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  if (!scanId) {
    res.status(400).json({ message: 'Scan id is required' });
    return;
  }

  const result = await scanService.getScanDownload(scanId, userId);
  if (result === 'not_found') {
    res.status(404).json({ message: 'Scan not found' });
    return;
  }
  if (result === 'forbidden') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.content);
}
