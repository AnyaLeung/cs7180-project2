import { Router } from 'express';
import * as scanController from '../controllers/scanController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/:id/download', authMiddleware, (req, res, next) => {
  void scanController.downloadScan(req, res).catch(next);
});

export default router;