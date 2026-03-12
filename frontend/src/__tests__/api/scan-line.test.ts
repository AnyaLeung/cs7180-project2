import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

function createMockReqRes(body: Record<string, unknown>, method = 'POST') {
  const req = { method, body };
  let responseStatus = 0;
  let responseBody: unknown = null;
  const res = {
    status: (code: number) => {
      responseStatus = code;
      return {
        json: (data: unknown) => { responseBody = data; },
      };
    },
  };
  return { req, res, getStatus: () => responseStatus, getBody: () => responseBody };
}

describe('scan-line serverless function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('returns 400 when commentText is missing', async () => {
    const { default: handler } = await import('../../../api/scan-line');
    const { req, res, getStatus, getBody } = createMockReqRes({});
    await handler(req as never, res as never);
    expect(getStatus()).toBe(400);
    expect(getBody()).toEqual({ error: 'commentText is required' });
  });

  it('returns classification for valid comment', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"isInstruction": true, "confidence": 0.92}' }],
    });

    const { default: handler } = await import('../../../api/scan-line');
    const { req, res, getStatus, getBody } = createMockReqRes({ commentText: '# Step 1: Load data' });
    await handler(req as never, res as never);
    expect(getStatus()).toBe(200);
    expect(getBody()).toEqual({ isInstruction: true, confidence: 0.92 });
  });

  it('returns 500 when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { default: handler } = await import('../../../api/scan-line');
    const { req, res, getStatus } = createMockReqRes({ commentText: '# test' });
    await handler(req as never, res as never);
    expect(getStatus()).toBe(500);
  });

  it('returns 500 on Claude API error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API error'));

    const { default: handler } = await import('../../../api/scan-line');
    const { req, res, getStatus } = createMockReqRes({ commentText: '# test' });
    await handler(req as never, res as never);
    expect(getStatus()).toBe(500);
  });

  it('rejects non-POST methods', async () => {
    const { default: handler } = await import('../../../api/scan-line');
    const { req, res, getStatus } = createMockReqRes({}, 'GET');
    await handler(req as never, res as never);
    expect(getStatus()).toBe(405);
  });
});
