import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../../pages/DashboardPage';

const mockGet = vi.fn();
const mockDel = vi.fn();

vi.mock('../../utils/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    del: (...args: unknown[]) => mockDel(...args),
    post: vi.fn(),
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and renders files', async () => {
    mockGet.mockResolvedValueOnce([
      { id: 'f1', fileName: 'script.py', sizeBytes: 1024, uploadedAt: '2026-01-01' },
    ]);

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('script.py')).toBeInTheDocument();
    });
    expect(mockGet).toHaveBeenCalledWith('/api/files');
  });

  it('shows empty state when no files', async () => {
    mockGet.mockResolvedValueOnce([]);

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/no files yet/i)).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {}));

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders file uploader', async () => {
    mockGet.mockResolvedValueOnce([]);

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/drop .py file here/i)).toBeInTheDocument();
    });
  });

  it('renders sign out button', async () => {
    mockGet.mockResolvedValueOnce([]);
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/sign out/i)).toBeInTheDocument();
    });
  });

  it('renders delete button for each file', async () => {
    mockGet.mockResolvedValueOnce([
      { id: 'f1', fileName: 'script.py', sizeBytes: 1024, uploadedAt: '2026-01-01' },
      { id: 'f2', fileName: 'data.py', sizeBytes: 2048, uploadedAt: '2026-01-02' },
    ]);

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons).toHaveLength(2);
    });
  });

  it('displays file sizes correctly', async () => {
    mockGet.mockResolvedValueOnce([
      { id: 'f1', fileName: 'small.py', sizeBytes: 512, uploadedAt: '2026-01-01' },
      { id: 'f2', fileName: 'medium.py', sizeBytes: 2048, uploadedAt: '2026-01-02' },
      { id: 'f3', fileName: 'large.py', sizeBytes: 1048576, uploadedAt: '2026-01-03' },
    ]);

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('512 B')).toBeInTheDocument();
      expect(screen.getByText('2.0 KB')).toBeInTheDocument();
      expect(screen.getByText('1.0 MB')).toBeInTheDocument();
    });
  });

  it('handles file list load error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/no files yet/i)).toBeInTheDocument();
    });
  });

  it('clicking delete calls api.del', async () => {
    mockGet.mockResolvedValueOnce([
      { id: 'f1', fileName: 'script.py', sizeBytes: 100, uploadedAt: '2026-01-01' },
    ]);
    mockDel.mockResolvedValueOnce(undefined);

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('script.py')).toBeInTheDocument();
    });

    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(mockDel).toHaveBeenCalledWith('/api/files/f1');
    });
  });
});
