import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileList } from '../../components/FileList';

const mockApiGet = vi.fn().mockResolvedValue([]);
const mockApiGetText = vi.fn().mockResolvedValue('text');

vi.mock('../../utils/api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    getText: (...args: unknown[]) => mockApiGetText(...args),
  },
}));

const mockFiles = [
  { id: 'f1', fileName: 'script.py', sizeBytes: 100, uploadedAt: '2026-01-01' },
  { id: 'f2', fileName: 'data.py', sizeBytes: 200, uploadedAt: '2026-01-02' },
];

describe('FileList', () => {
  it('renders file names', () => {
    render(<FileList files={mockFiles} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByText('script.py')).toBeInTheDocument();
    expect(screen.getByText('data.py')).toBeInTheDocument();
  });

  it('calls onSelect when file is clicked', () => {
    const onSelect = vi.fn();
    render(<FileList files={mockFiles} selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('script.py'));
    expect(onSelect).toHaveBeenCalledWith('f1');
  });

  it('shows "No files" when list is empty', () => {
    render(<FileList files={[]} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByText('No files')).toBeInTheDocument();
  });

  it('shows "Open new file" button when onUpload is provided', () => {
    render(
      <FileList
        files={mockFiles}
        selectedId={null}
        onSelect={vi.fn()}
        onUpload={vi.fn()}
        uploadState={{ isUploading: false, progress: 0, error: null }}
      />
    );
    expect(screen.getByText('Open new file')).toBeInTheDocument();
  });

  it('shows "Uploading..." when upload is in progress', () => {
    render(
      <FileList
        files={mockFiles}
        selectedId={null}
        onSelect={vi.fn()}
        onUpload={vi.fn()}
        uploadState={{ isUploading: true, progress: 50, error: null }}
      />
    );
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('highlights selected file', () => {
    render(<FileList files={mockFiles} selectedId="f1" onSelect={vi.fn()} />);
    const fileButton = screen.getByText('script.py').closest('div');
    expect(fileButton?.className).toContain('border-purple-500');
  });

  it('renders download button for each file', () => {
    render(<FileList files={mockFiles} selectedId={null} onSelect={vi.fn()} />);
    const downloadButtons = screen.getAllByLabelText('download whole file instructions');
    expect(downloadButtons).toHaveLength(2);
  });

  it('calls onUpload when file input changes', () => {
    const onUpload = vi.fn();
    render(
      <FileList
        files={mockFiles}
        selectedId={null}
        onSelect={vi.fn()}
        onUpload={onUpload}
        uploadState={{ isUploading: false, progress: 0, error: null }}
      />
    );
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['# test'], 'test.py', { type: 'text/x-python' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('shows upload error when present', () => {
    render(
      <FileList
        files={mockFiles}
        selectedId={null}
        onSelect={vi.fn()}
        onUpload={vi.fn()}
        uploadState={{ isUploading: false, progress: 0, error: 'Upload failed' }}
      />
    );
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('does not show upload button when onUpload is not provided', () => {
    render(<FileList files={mockFiles} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.queryByText('Open new file')).not.toBeInTheDocument();
  });

  it('renders "Files" header', () => {
    render(<FileList files={mockFiles} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByText('Files')).toBeInTheDocument();
  });

  it('download button triggers scan download', async () => {
    mockApiGet.mockResolvedValueOnce([
      { id: 'scan-1', scannedAt: '2026-01-01', instructionCount: 5 },
    ]);
    mockApiGetText.mockResolvedValueOnce('Scan results:\n# Step 1');

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<FileList files={mockFiles} selectedId={null} onSelect={vi.fn()} />);
    const downloadButtons = screen.getAllByLabelText('download whole file instructions');
    fireEvent.click(downloadButtons[0]);

    await vi.waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/api/files/f1/scans');
    });

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('download shows alert when no scan history', async () => {
    mockApiGet.mockResolvedValueOnce([]);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<FileList files={mockFiles} selectedId={null} onSelect={vi.fn()} />);
    const downloadButtons = screen.getAllByLabelText('download whole file instructions');
    fireEvent.click(downloadButtons[0]);

    await vi.waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('No scan history'));
    });

    alertSpy.mockRestore();
  });

  it('download shows alert on API error', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('Network error'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<FileList files={mockFiles} selectedId={null} onSelect={vi.fn()} />);
    const downloadButtons = screen.getAllByLabelText('download whole file instructions');
    fireEvent.click(downloadButtons[0]);

    await vi.waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Network error');
    });

    alertSpy.mockRestore();
  });
});
