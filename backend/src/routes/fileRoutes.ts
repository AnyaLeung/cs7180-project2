import { Router } from 'express';
import multer from 'multer';
import * as fileController from '../controllers/fileController';
import * as scanController from '../controllers/scanController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post(
  '/upload',
  authMiddleware,
  upload.single('file'),
  (req, res, next) => {
    void fileController.upload(req, res).catch(next);
  }
);

router.get('/', authMiddleware, (req, res, next) => {
  void fileController.list(req, res).catch(next);
});

router.delete('/:id', authMiddleware, (req, res, next) => {
  void fileController.deleteFile(req, res).catch(next);
});

router.post('/:id/scan', authMiddleware, (req, res, next) => {
  void scanController.scanFile(req, res).catch(next);
});

router.get('/:id/scans', authMiddleware, (req, res, next) => {
  void scanController.listScans(req, res).catch(next);
});

export default router;
