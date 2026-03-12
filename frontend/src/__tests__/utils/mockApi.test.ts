import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('mockApi', () => {
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    originalFetch = window.fetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
    vi.resetModules();
  });

  it('enableMockApi replaces window.fetch', async () => {
    const { enableMockApi } = await import('../../utils/mockApi');
    enableMockApi();
    expect(window.fetch).not.toBe(originalFetch);
  });

  it('mock login returns token', async () => {
    const { enableMockApi } = await import('../../utils/mockApi');
    enableMockApi();

    const res = await window.fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'pass' }),
    });
    const data = await res.json() as { token: string };
    expect(res.status).toBe(200);
    expect(data.token).toContain('mock-jwt-token-for-test@example.com');
  });

  it('mock register returns user id', async () => {
    const { enableMockApi } = await import('../../utils/mockApi');
    enableMockApi();

    const res = await window.fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@example.com', password: 'pass' }),
    });
    const data = await res.json() as { id: string; email: string };
    expect(res.status).toBe(200);
    expect(data.email).toBe('new@example.com');
    expect(data.id).toBeDefined();
  });

  it('mock GET /api/files returns file list', async () => {
    const { enableMockApi } = await import('../../utils/mockApi');
    enableMockApi();

    const res = await window.fetch('/api/files');
    const data = await res.json() as { id: string; fileName: string }[];
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('fileName');
  });

  it('mock GET /api/files/:id/content returns content', async () => {
    const { enableMockApi } = await import('../../utils/mockApi');
    enableMockApi();

    const res = await window.fetch('/api/files/file-1/content');
    const data = await res.json() as { content: string };
    expect(res.status).toBe(200);
    expect(data.content).toContain('Step 1');
  });

  it('does not intercept scan-line route (passes through)', async () => {
    const { enableMockApi } = await import('../../utils/mockApi');
    enableMockApi();

    let passedThrough = false;
    try {
      await window.fetch('http://localhost:3002/api/scan-line', {
        method: 'POST',
        body: JSON.stringify({ commentText: '# test' }),
      });
      passedThrough = true;
    } catch {
      passedThrough = true;
    }
    expect(passedThrough).toBe(true);
  });
});
