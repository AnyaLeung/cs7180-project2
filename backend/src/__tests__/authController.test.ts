import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import * as authController from '../controllers/authController';
import * as authService from '../services/authService';

vi.mock('../services/supabaseClient', () => ({
  supabase: {},
}));

vi.mock('../services/authService', async () => {
  class AuthError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'AuthError';
      this.code = code;
    }
  }
  return {
    register: vi.fn(),
    login: vi.fn(),
    AuthError,
  };
});

function mockReq(body: Record<string, unknown> = {}): Request {
  return { body } as unknown as Request;
}

function mockRes(): Response {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('authController.register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 for invalid email', async () => {
    const req = mockReq({ email: 'nope', password: 'pass123' });
    const res = mockRes();
    await authController.register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Valid email is required' });
  });

  it('returns 400 for missing password', async () => {
    const req = mockReq({ email: 'a@b.com', password: '' });
    const res = mockRes();
    await authController.register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Password is required' });
  });

  it('returns 201 on successful registration', async () => {
    vi.mocked(authService.register).mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    const req = mockReq({ email: 'a@b.com', password: 'pass123' });
    const res = mockRes();
    await authController.register(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const jsonArg = vi.mocked(res.json).mock.calls[0][0] as { user: { id: string }; token: string };
    expect(jsonArg.user.id).toBe('u1');
    expect(jsonArg.token).toBeTruthy();
  });

  it('returns 400 for duplicate email', async () => {
    const err = new authService.AuthError('dup', 'DUPLICATE_EMAIL');
    vi.mocked(authService.register).mockRejectedValue(err);
    const req = mockReq({ email: 'a@b.com', password: 'pass123' });
    const res = mockRes();
    await authController.register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email already registered' });
  });

  it('re-throws non-AuthError', async () => {
    vi.mocked(authService.register).mockRejectedValue(new Error('db error'));
    const req = mockReq({ email: 'a@b.com', password: 'pass123' });
    const res = mockRes();
    await expect(authController.register(req, res)).rejects.toThrow('db error');
  });
});

describe('authController.login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 for invalid email', async () => {
    const req = mockReq({ email: '', password: 'pass' });
    const res = mockRes();
    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Valid email is required' });
  });

  it('returns 400 for missing password', async () => {
    const req = mockReq({ email: 'a@b.com' });
    const res = mockRes();
    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Password is required' });
  });

  it('returns 401 for wrong credentials', async () => {
    vi.mocked(authService.login).mockResolvedValue(null);
    const req = mockReq({ email: 'a@b.com', password: 'wrong' });
    const res = mockRes();
    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
  });

  it('returns 200 with token on success', async () => {
    vi.mocked(authService.login).mockResolvedValue({ userId: 'u1' });
    const req = mockReq({ email: 'a@b.com', password: 'pass123' });
    const res = mockRes();
    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = vi.mocked(res.json).mock.calls[0][0] as { token: string };
    expect(jsonArg.token).toBeTruthy();
  });
});
