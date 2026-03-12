import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.local
try {
  const envPath = resolve(import.meta.dirname ?? '.', '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      process.env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
    }
  }
} catch { /* no .env.local */ }

type HandlerFn = (
  req: { method: string; body: Record<string, unknown> },
  res: { status: (code: number) => { json: (body: unknown) => void } }
) => Promise<void>;

async function loadHandler(name: string): Promise<HandlerFn> {
  const mod = await import(`./api/${name}.ts`);
  return mod.default;
}

// ── Mock data for auth & files (no real backend yet) ──

interface MockFile {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}

const mockFiles: MockFile[] = [
  { id: 'file-1', fileName: 'analysis_plan.py', sizeBytes: 1234, uploadedAt: '2026-02-27T10:00:00Z' },
  { id: 'file-2', fileName: 'data_cleaning.py', sizeBytes: 2048, uploadedAt: '2026-02-26T15:30:00Z' },
];

const mockContents: Record<string, string> = {
  'file-1': `# Step 1: Load the dataset from CSV
# Step 2: Clean missing values
# Step 3: Filter rows where age > 18
# Step 4: Compute summary statistics
# Step 5: Visualize the distribution of income

import pandas as pd

# This is just a regular comment, not an instruction
# Author: demo user

df = pd.read_csv("data.csv")
print(df.head())
`,
  'file-2': `# Step 1: Read raw data from the API
# Step 2: Transform column names to snake_case
# Step 3: Merge with the reference table
# Step 4: Export cleaned data to Parquet

import pandas as pd
import requests

# Configuration
API_URL = "https://api.example.com/data"
`,
};

let nextId = 3;

type MockRoute = (
  method: string,
  url: string,
  body: Record<string, unknown>
) => { status: number; body?: unknown } | null;

const mockRoutes: MockRoute[] = [
  // POST /api/auth/login
  (method, url, body) => {
    if (method !== 'POST' || !url.endsWith('/api/auth/login')) return null;
    const email = (body.email as string) ?? 'user';
    return { status: 200, body: { token: `mock-jwt-for-${email}` } };
  },
  // POST /api/auth/register
  (method, url, body) => {
    if (method !== 'POST' || !url.endsWith('/api/auth/register')) return null;
    return { status: 200, body: { id: `user-${nextId++}`, email: body.email } };
  },
  // GET /api/files
  (method, url) => {
    if (method !== 'GET' || !url.endsWith('/api/files')) return null;
    return { status: 200, body: mockFiles };
  },
  // DELETE /api/files/:id
  (method, url) => {
    const m = url.match(/\/api\/files\/([^/]+)$/);
    if (method !== 'DELETE' || !m) return null;
    const idx = mockFiles.findIndex((f) => f.id === m[1]);
    if (idx >= 0) mockFiles.splice(idx, 1);
    return { status: 204 };
  },
  // GET /api/files/:id/content
  (method, url) => {
    const m = url.match(/\/api\/files\/([^/]+)\/content$/);
    if (method !== 'GET' || !m) return null;
    return { status: 200, body: { content: mockContents[m[1]] ?? '# Empty file\n' } };
  },
  // POST /api/files (upload — simplified mock)
  (method, url) => {
    if (method !== 'POST' || !url.endsWith('/api/files')) return null;
    const f: MockFile = {
      id: `file-${nextId++}`,
      fileName: 'uploaded.py',
      sizeBytes: 100,
      uploadedAt: new Date().toISOString(),
    };
    mockFiles.unshift(f);
    return { status: 200, body: f };
  },
];

function tryMockRoute(method: string, url: string, body: Record<string, unknown>): { status: number; body?: unknown } | null {
  for (const route of mockRoutes) {
    const result = route(method, url, body);
    if (result) return result;
  }
  return null;
}

// ── Server ──

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url ?? '';
  const method = req.method ?? 'GET';

  let bodyStr = '';
  for await (const chunk of req) bodyStr += chunk;
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(bodyStr); } catch { /* empty */ }

  // Claude-powered endpoints (real API)
  if (url.startsWith('/api/scan-line') || url.startsWith('/api/generate')) {
    const handlerName = url.startsWith('/api/scan-line') ? 'scan-line' : 'generate';
    const handler = await loadHandler(handlerName);
    const fakeReq = { method, body };
    const fakeRes = {
      status: (code: number) => ({
        json: (data: unknown) => {
          res.writeHead(code, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        },
      }),
    };
    try {
      await handler(fakeReq, fakeRes);
    } catch (err) {
      console.error('Handler error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Mock endpoints (auth, files)
  const mockResult = tryMockRoute(method, url, body);
  if (mockResult) {
    if (mockResult.status === 204) {
      res.writeHead(204);
      res.end();
    } else {
      res.writeHead(mockResult.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockResult.body));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`\n  API dev server running at http://localhost:${PORT}`);
  console.log(`  Routes: /api/auth/*, /api/files/* (mock) | /api/scan-line, /api/generate (Claude)`);
  console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'set (' + process.env.ANTHROPIC_API_KEY.slice(0, 12) + '...)' : 'NOT SET'}\n`);
});
