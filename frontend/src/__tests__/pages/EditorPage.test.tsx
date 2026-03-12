import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EditorPage } from '../../pages/EditorPage';

const mockGet = vi.fn();

vi.mock('../../utils/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    del: vi.fn(),
    getText: vi.fn(),
  },
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    isAuthenticated: true,
    token: 'mock-jwt',
    login: vi.fn(),
    register: vi.fn(),
  }),
}));

vi.mock('../../utils/hoverExtension', () => ({
  instructionHoverTooltip: () => [],
  tooltipBaseTheme: [],
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderEditorPage(fileId = 'file-1') {
  return render(
    <MemoryRouter initialEntries={[`/editor/${fileId}`]}>
      <Routes>
        <Route path="/editor/:fileId" element={<EditorPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('EditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((path: string) => {
      if (path === '/api/files') {
        return Promise.resolve([
          { id: 'file-1', fileName: 'script.py', sizeBytes: 100, uploadedAt: '2026-01-01' },
          { id: 'file-2', fileName: 'data.py', sizeBytes: 200, uploadedAt: '2026-01-02' },
        ]);
      }
      if (path.includes('/content')) {
        return Promise.resolve({ content: '# Step 1: Load data\nimport pandas as pd\n' });
      }
      return Promise.resolve([]);
    });
  });

  it('renders loading state initially', () => {
    renderEditorPage();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('loads and renders file content in editor', async () => {
    renderEditorPage();
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    const editor = document.querySelector('.cm-content');
    expect(editor).toBeTruthy();
    expect(editor?.textContent).toContain('Step 1');
  });

  it('renders file list sidebar', async () => {
    renderEditorPage();
    await waitFor(() => {
      expect(screen.getByText('script.py')).toBeInTheDocument();
    });
    expect(screen.getByText('data.py')).toBeInTheDocument();
  });

  it('renders InstructScan branding', async () => {
    renderEditorPage();
    await waitFor(() => {
      expect(screen.getByText('InstructScan')).toBeInTheDocument();
    });
  });

  it('renders sign out button', async () => {
    renderEditorPage();
    await waitFor(() => {
      expect(screen.getByText(/sign out/i)).toBeInTheDocument();
    });
  });

  it('handles content load failure gracefully', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/api/files') return Promise.resolve([]);
      if (path.includes('/content')) return Promise.reject(new Error('fail'));
      return Promise.resolve([]);
    });

    renderEditorPage();
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    const editor = document.querySelector('.cm-content');
    expect(editor?.textContent).toContain('Failed to load file');
  });

  it('renders file upload button in sidebar', async () => {
    renderEditorPage();
    await waitFor(() => {
      expect(screen.getByText('Open new file')).toBeInTheDocument();
    });
  });
});
