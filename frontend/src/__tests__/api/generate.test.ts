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

describe('generate serverless function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('returns 400 when commentText is missing', async () => {
    const { default: handler } = await import('../../../api/generate');
    const { req, res, getStatus } = createMockReqRes({ action: 'write-code', fileContent: '# test' });
    await handler(req as never, res as never);
    expect(getStatus()).toBe(400);
  });

  it('returns 400 for invalid action', async () => {
    const { default: handler } = await import('../../../api/generate');
    const { req, res, getStatus } = createMockReqRes({
      commentText: '# Step 1',
      action: 'invalid-action',
      fileContent: '# test',
    });
    await handler(req as never, res as never);
    expect(getStatus()).toBe(400);
  });

  it('returns 400 when fileContent is missing', async () => {
    const { default: handler } = await import('../../../api/generate');
    const { req, res, getStatus } = createMockReqRes({
      commentText: '# Step 1',
      action: 'write-code',
    });
    await handler(req as never, res as never);
    expect(getStatus()).toBe(400);
  });

  it('generates code for write-code action', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'import pandas as pd\ndf = pd.read_csv("data.csv")\n' }],
    });

    const { default: handler } = await import('../../../api/generate');
    const { req, res, getStatus, getBody } = createMockReqRes({
      commentText: '# Load data',
      action: 'write-code',
      fileContent: '# test file',
    });
    await handler(req as never, res as never);
    expect(getStatus()).toBe(200);
    const body = getBody() as { generatedText: string };
    expect(body.generatedText).toContain('import pandas as pd');
  });

  it('generates plan for detail-plan action', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '# 1. Check columns\n# 2. Apply filter\n' }],
    });

    const { default: handler } = await import('../../../api/generate');
    const { req, res, getStatus, getBody } = createMockReqRes({
      commentText: '# Clean data',
      action: 'detail-plan',
      fileContent: '# test',
    });
    await handler(req as never, res as never);
    expect(getStatus()).toBe(200);
    const body = getBody() as { generatedText: string };
    expect(body.generatedText).toContain('Check columns');
  });

  it('generates alternative for alternative-plan action', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '# Alternative: use polars instead\n' }],
    });

    const { default: handler } = await import('../../../api/generate');
    const { req, res, getStatus, getBody } = createMockReqRes({
      commentText: '# Filter rows',
      action: 'alternative-plan',
      fileContent: '# test',
    });
    await handler(req as never, res as never);
    expect(getStatus()).toBe(200);
    const body = getBody() as { generatedText: string };
    expect(body.generatedText).toContain('polars');
  });

  it('returns 500 on Claude API error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API failure'));

    const { default: handler } = await import('../../../api/generate');
    const { req, res, getStatus } = createMockReqRes({
      commentText: '# test',
      action: 'write-code',
      fileContent: '# file',
    });
    await handler(req as never, res as never);
    expect(getStatus()).toBe(500);
  });

  it('rejects non-POST methods', async () => {
    const { default: handler } = await import('../../../api/generate');
    const { req, res, getStatus } = createMockReqRes({}, 'GET');
    await handler(req as never, res as never);
    expect(getStatus()).toBe(405);
  });
});
