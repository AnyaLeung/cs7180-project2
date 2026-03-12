import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

const uniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

describe('POST /auth/register', () => {
  it('returns 201 with user and token for valid body', async () => {
    const email = uniqueEmail();
    const res = await request(app)
      .post('/auth/register')
      .send({ email, password: 'password123' });
    expect(res.status).toBe(201);
    /* eslint-disable @typescript-eslint/no-unsafe-assignment -- supertest res.body is untyped */
    expect(res.body).toMatchObject({
      user: { id: expect.any(String), email },
      token: expect.any(String),
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });

  it('returns 400 for duplicate email', async () => {
    const email = uniqueEmail();
    await request(app).post('/auth/register').send({ email, password: 'password123' });
    const res = await request(app).post('/auth/register').send({ email, password: 'other' });
    expect(res.status).toBe(400);
    expect((res.body as { message?: string }).message).toMatch(/already registered/i);
  });

  it('returns 400 when email or password missing', async () => {
    const res1 = await request(app).post('/auth/register').send({ password: 'x' });
    expect(res1.status).toBe(400);
    const res2 = await request(app).post('/auth/register').send({ email: 'a@b.co' });
    expect(res2.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('returns 200 with token for valid credentials', async () => {
    const email = uniqueEmail();
    await request(app).post('/auth/register').send({ email, password: 'secret' });
    const res = await request(app).post('/auth/login').send({ email, password: 'secret' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('returns 401 for wrong password', async () => {
    const email = uniqueEmail();
    await request(app).post('/auth/register').send({ email, password: 'correct' });
    const res = await request(app).post('/auth/login').send({ email, password: 'wrong' });
    expect(res.status).toBe(401);
    expect((res.body as { message?: string }).message).toMatch(/invalid/i);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'any' });
    expect(res.status).toBe(401);
  });
});

describe('GET /auth/me (protected)', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });

  it('returns 200 with userId when token is valid', async () => {
    const email = uniqueEmail();
    const reg = await request(app).post('/auth/register').send({ email, password: 'p' });
    expect(reg.status).toBe(201);
    const regBody = reg.body as { token: string; user: { id: string } };
    const token = regBody.token;
    const userId = regBody.user.id;
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('userId', userId);
  });
});
