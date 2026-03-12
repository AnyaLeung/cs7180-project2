import { describe, it, expect, vi, beforeEach } from 'vitest';

const originalFetch = globalThis.fetch;
let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  mockFetch = vi.fn();
  globalThis.fetch = mockFetch;
  localStorage.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

async function getApi() {
  const mod = await import('../../utils/api');
  return mod.api;
}

describe('api', () => {
  it('get attaches JWT from localStorage', async () => {
    localStorage.setItem('token', 'my-jwt');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
    });

    const api = await getApi();
    await api.get('/api/files');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/files',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-jwt',
        }),
      })
    );
  });

  it('omits Authorization header when no token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    const api = await getApi();
    await api.get('/api/files');

    const callHeaders = mockFetch.mock.calls[0][1].headers as Record<string, string>;
    expect(callHeaders.Authorization).toBeUndefined();
  });

  it('post sends JSON body with Content-Type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ token: 'jwt' }),
    });

    const api = await getApi();
    await api.post('/api/auth/login', { email: 'a@b.com', password: 'p' });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.com', password: 'p' });
  });

  it('post sends FormData without Content-Type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'f1' }),
    });

    const api = await getApi();
    const fd = new FormData();
    fd.append('file', new Blob(['test']), 'test.py');
    await api.post('/api/files', fd);

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ error: 'Invalid token' }),
    });

    const api = await getApi();
    await expect(api.get('/api/files')).rejects.toThrow('Invalid token');
  });

  it('del sends DELETE method', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => Promise.resolve(undefined),
    });

    const api = await getApi();
    await api.del('/api/files/f1');

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('DELETE');
  });

  it('handles 204 response returning undefined', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const api = await getApi();
    const result = await api.del('/api/files/f1');
    expect(result).toBeUndefined();
  });

  it('getText returns text response', async () => {
    localStorage.setItem('token', 'jwt-123');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('Scan results:\n# Step 1'),
    });

    const api = await getApi();
    const result = await api.getText('/api/scans/123/download');
    expect(result).toBe('Scan results:\n# Step 1');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/scans/123/download',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-123',
        }),
      })
    );
  });

  it('getText throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Scan not found' }),
    });

    const api = await getApi();
    await expect(api.getText('/api/scans/999/download')).rejects.toThrow('Scan not found');
  });

  it('throws generic error when response body parse fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('parse error')),
    });

    const api = await getApi();
    await expect(api.get('/api/files')).rejects.toThrow('Internal Server Error');
  });
});
