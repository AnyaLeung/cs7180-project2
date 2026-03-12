import { Request, Response } from 'express';
import * as fileService from '../services/fileService';

export async function upload(req: Request, res: Response): Promise<void> {
  const userId = req.userId;
  const file = req.file;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  if (!file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  try {
    const result = await fileService.upload(userId, {
      buffer: file.buffer,
      originalname: file.originalname,
      size: file.size,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof fileService.BadRequestError) {
      res.status(400).json({ message: err.message });
      return;
    }
    throw err;
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const files = await fileService.listByUserId(userId);
  res.status(200).json(files);
}

export async function deleteFile(req: Request, res: Response): Promise<void> {
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

  const result = await fileService.deleteById(fileId, userId);
  if (result === 'not_found') {
    res.status(404).json({ message: 'File not found' });
    return;
  }
  if (result === 'forbidden') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  res.status(204).send();
}

export async function getContent(req: Request, res: Response): Promise<void> {
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

  const result = await fileService.getFileContentById(fileId, userId);
  if (result === 'not_found') {
    res.status(404).json({ message: 'File not found' });
    return;
  }
  if (result === 'forbidden') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  res.status(200).json({ content: result.content });
}
