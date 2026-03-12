import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as authService from '../services/authService';

const JWT_EXPIRES_IN = '24h';

function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ userId }, secret, { expiresIn: JWT_EXPIRES_IN });
}

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length > 0 && email.includes('@');
}

function isValidPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 1;
}

interface AuthBody {
  email?: unknown;
  password?: unknown;
}

export async function register(req: Request, res: Response): Promise<void> {
  const body = req.body as AuthBody;
  const email = body.email;
  const password = body.password;

  if (!isValidEmail(email)) {
    res.status(400).json({ message: 'Valid email is required' });
    return;
  }
  if (!isValidPassword(password)) {
    res.status(400).json({ message: 'Password is required' });
    return;
  }

  try {
    const user = await authService.register(email, password);
    const token = signToken(user.id);
    res.status(201).json({ user: { id: user.id, email: user.email }, token });
  } catch (err) {
    if (err instanceof authService.AuthError && err.code === 'DUPLICATE_EMAIL') {
      res.status(400).json({ message: 'Email already registered' });
      return;
    }
    throw err;
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = req.body as AuthBody;
  const email = body.email;
  const password = body.password;

  if (!isValidEmail(email)) {
    res.status(400).json({ message: 'Valid email is required' });
    return;
  }
  if (!isValidPassword(password)) {
    res.status(400).json({ message: 'Password is required' });
    return;
  }

  const result = await authService.login(email, password);
  if (!result) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  const token = signToken(result.userId);
  res.status(200).json({ token });
}
