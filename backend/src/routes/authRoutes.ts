import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', (req, res, next) => {
  void authController.register(req, res).catch(next);
});
router.post('/login', (req, res, next) => {
  void authController.login(req, res).catch(next);
});
router.get('/me', authMiddleware, (req, res) => {
  res.json({ userId: req.userId });
});

export default router;
