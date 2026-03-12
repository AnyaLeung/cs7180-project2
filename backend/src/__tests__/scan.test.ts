import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

const uniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

async function getToken(): Promise<string> {
  const email = uniqueEmail();
  const res = await request(app).post('/auth/register').send({ email, password: 'p' });
  expect(res.status).toBe(201);
  return (res.body as { token: string }).token;
}

describe('Scan (unauthenticated → 401)', () => {
  it('POST /files/:id/scan returns 401 without Authorization', async () => {
    const res = await request(app).post('/files/00000000-0000-0000-0000-000000000001/scan');
    expect(res.status).toBe(401);
  });

  it('GET /files/:id/scans returns 401 without Authorization', async () => {
    const res = await request(app).get('/files/00000000-0000-0000-0000-000000000001/scans');
    expect(res.status).toBe(401);
  });

  it('GET /scans/:id/download returns 401 without Authorization', async () => {
    const res = await request(app).get('/scans/00000000-0000-0000-0000-000000000001/download');
    expect(res.status).toBe(401);
  });
});

describe('POST /files/:id/scan', () => {
  it('returns 404 when file does not exist', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/files/00000000-0000-0000-0000-000000000099/scan')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /files/:id/scans', () => {
  it('returns 404 when file does not exist', async () => {
    const token = await getToken();
    const res = await request(app)
      .get('/files/00000000-0000-0000-0000-000000000099/scans')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /scans/:id/download', () => {
  it('returns 404 when scan does not exist', async () => {
    const token = await getToken();
    const res = await request(app)
      .get('/scans/00000000-0000-0000-0000-000000000099/download')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
