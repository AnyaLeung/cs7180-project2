import type { FileInfo } from '../hooks/useFileUpload';

const MOCK_FILES: FileInfo[] = [
  {
    id: 'file-1',
    filename: 'analysis_plan.py',
    sizeBytes: 1234,
    uploadedAt: '2026-02-27T10:00:00Z',
  },
  {
    id: 'file-2',
    filename: 'data_cleaning.py',
    sizeBytes: 2048,
    uploadedAt: '2026-02-26T15:30:00Z',
  },
];

const MOCK_FILE_CONTENTS: Record<string, string> = {
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

type RouteHandler = (
  method: string,
  url: URL,
  body: Record<string, unknown> | FormData | null
) => { status: number; body?: unknown } | null;

const routes: RouteHandler[] = [
  // POST /api/auth/login
  (method, url, body) => {
    if (method !== 'POST' || !url.pathname.endsWith('/api/auth/login')) return null;
    const { email } = body as Record<string, string>;
    return {
      status: 200,
      body: { token: `mock-jwt-token-for-${email ?? 'user'}` },
    };
  },

  // POST /api/auth/register
  (method, url, body) => {
    if (method !== 'POST' || !url.pathname.endsWith('/api/auth/register')) return null;
    const { email } = body as Record<string, string>;
    return {
      status: 200,
      body: { id: `user-${nextId++}`, email },
    };
  },

  // GET /api/files
  (method, url) => {
    if (method !== 'GET' || !url.pathname.endsWith('/api/files')) return null;
    return { status: 200, body: MOCK_FILES };
  },

  // POST /api/files (upload)
  (method, url, body) => {
    if (method !== 'POST' || !url.pathname.endsWith('/api/files')) return null;
    const formData = body as FormData;
    const file = formData?.get('file') as File | null;
    const newFile: FileInfo = {
      id: `file-${nextId++}`,
      filename: file?.name ?? 'uploaded.py',
      sizeBytes: file?.size ?? 0,
      uploadedAt: new Date().toISOString(),
    };
    MOCK_FILES.unshift(newFile);

    if (file) {
      file.text().then((text) => {
        MOCK_FILE_CONTENTS[newFile.id] = text;
      });
    }

    return { status: 200, body: newFile };
  },

  // DELETE /api/files/:id
  (method, url) => {
    const match = url.pathname.match(/\/api\/files\/([^/]+)$/);
    if (method !== 'DELETE' || !match) return null;
    const idx = MOCK_FILES.findIndex((f) => f.id === match[1]);
    if (idx >= 0) MOCK_FILES.splice(idx, 1);
    return { status: 204 };
  },

  // GET /api/files/:id/content
  (method, url) => {
    const match = url.pathname.match(/\/api\/files\/([^/]+)\/content$/);
    if (method !== 'GET' || !match) return null;
    const content = MOCK_FILE_CONTENTS[match[1]] ?? '# Empty file\n';
    return { status: 200, body: { content } };
  },

  // scan-line and generate are NOT mocked — they pass through to the real API server
];

function parseBody(init?: RequestInit): Record<string, unknown> | FormData | null {
  if (!init?.body) return null;
  if (init.body instanceof FormData) return init.body;
  try {
    return JSON.parse(init.body as string) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const originalFetch = window.fetch.bind(window);

function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    window.location.origin
  );
  const method = (init?.method ?? 'GET').toUpperCase();
  const body = parseBody(init);

  for (const handler of routes) {
    const result = handler(method, url, body);
    if (result) {
      return new Promise((resolve) => {
        // Simulate network latency
        setTimeout(() => {
          resolve(
            new Response(
              result.body !== undefined ? JSON.stringify(result.body) : null,
              {
                status: result.status,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          );
        }, 200);
      });
    }
  }

  return originalFetch(input, init);
}

export function enableMockApi() {
  window.fetch = mockFetch as typeof window.fetch;
  console.log(
    '%c[MockAPI] Enabled — auth & files mocked, scan-line & generate pass through to real API',
    'color: #a78bfa; font-weight: bold'
  );
}
