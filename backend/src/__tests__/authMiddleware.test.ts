import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth';

function mockReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function mockRes(): Response {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('authMiddleware', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('returns 401 when Authorization header is missing', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer', () => {
    const req = mockReq({ authorization: 'Basic abc' });
    const res = mockRes();
    const next = vi.fn();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 500 when JWT_SECRET is not set', () => {
    delete process.env.JWT_SECRET;
    const req = mockReq({ authorization: 'Bearer sometoken' });
    const res = mockRes();
    const next = vi.fn();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Server configuration error' });
    process.env.JWT_SECRET = originalSecret;
  });

  it('returns 401 for invalid token', () => {
    const req = mockReq({ authorization: 'Bearer invalid.token.here' });
    const res = mockRes();
    const next = vi.fn();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
  });

  it('calls next and sets userId for valid token', () => {
    const token = jwt.sign({ userId: 'u-123' }, 'test-secret', { expiresIn: '1h' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next: NextFunction = vi.fn();
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe('u-123');
  });
});
