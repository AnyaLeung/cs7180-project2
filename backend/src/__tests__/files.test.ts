import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { supabase } from '../services/supabaseClient';

const uniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

beforeAll(async () => {
  const { error } = await supabase.storage.createBucket('python-files', { public: false });
  if (error && !String(error.message).toLowerCase().includes('already exists')) throw error;
});

async function getToken(): Promise<string> {
  const email = uniqueEmail();
  const res = await request(app).post('/auth/register').send({ email, password: 'p' });
  expect(res.status).toBe(201);
  return (res.body as { token: string }).token;
}

const smallPyContent = Buffer.from('# test\nprint("hi")\n');

describe('Files (unauthenticated → 401)', () => {
  it('POST /files/upload returns 401 without Authorization', async () => {
    const res = await request(app)
      .post('/files/upload')
      .attach('file', smallPyContent, 'test.py');
    expect(res.status).toBe(401);
  });

  it('GET /files returns 401 without Authorization', async () => {
    const res = await request(app).get('/files');
    expect(res.status).toBe(401);
  });

  it('DELETE /files/:id returns 401 without Authorization', async () => {
    const res = await request(app).delete('/files/00000000-0000-0000-0000-000000000001');
    expect(res.status).toBe(401);
  });
});

describe('POST /files/upload', () => {
  it('returns 201 with camelCase body for valid .py file', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', smallPyContent, 'script.py');
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('filename', 'script.py');
    expect(res.body).toHaveProperty('storagePath');
    expect(res.body).toHaveProperty('sizeBytes');
    expect(res.body).toHaveProperty('uploadedAt');
  });

  it('returns 400 when no file uploaded', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/files/upload')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect((res.body as { message?: string }).message).toMatch(/no file/i);
  });

  it('returns 400 for non-.py file', async () => {
    const token = await getToken();
    const res = await request(app)
      .post('/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('text'), 'readme.txt');
    expect(res.status).toBe(400);
    expect((res.body as { message?: string }).message).toMatch(/\.py/i);
  });
});

describe('GET /files', () => {
  it('returns 200 with array of files in camelCase', async () => {
    const token = await getToken();
    const res = await request(app)
      .get('/files')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const list = res.body as { id: string; filename: string; storagePath: string; sizeBytes: number; uploadedAt: string }[];
    expect(Array.isArray(list)).toBe(true);
    for (const f of list) {
      expect(f).toHaveProperty('id');
      expect(f).toHaveProperty('filename');
      expect(f).toHaveProperty('storagePath');
      expect(f).toHaveProperty('sizeBytes');
      expect(f).toHaveProperty('uploadedAt');
    }
  });
});

describe('DELETE /files/:id', () => {
  it('returns 204 and file is removed from list', async () => {
    const token = await getToken();
    const uploadRes = await request(app)
      .post('/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', smallPyContent, 'to-delete.py');
    expect(uploadRes.status).toBe(201);
    const fileId = (uploadRes.body as { id: string }).id;

    const deleteRes = await request(app)
      .delete(`/files/${fileId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(204);

    const listRes = await request(app)
      .get('/files')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    const ids = (listRes.body as { id: string }[]).map((f) => f.id);
    expect(ids).not.toContain(fileId);
  });

  it('returns 404 for nonexistent file id', async () => {
    const token = await getToken();
    const res = await request(app)
      .delete('/files/00000000-0000-0000-0000-000000000099')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 403 when deleting another user file', async () => {
    const tokenA = await getToken();
    const tokenB = await getToken();
    const uploadRes = await request(app)
      .post('/files/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', smallPyContent, 'user-a.py');
    expect(uploadRes.status).toBe(201);
    const fileId = (uploadRes.body as { id: string }).id;

    const res = await request(app)
      .delete(`/files/${fileId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });
});
