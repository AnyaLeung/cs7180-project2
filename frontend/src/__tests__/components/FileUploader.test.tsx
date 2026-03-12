import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploader } from '../../components/FileUploader';

describe('FileUploader', () => {
  const defaultProps = {
    uploadState: { isUploading: false, progress: 0, error: null },
    onUpload: vi.fn(),
    onClearError: vi.fn(),
  };

  it('renders dropzone text', () => {
    render(<FileUploader {...defaultProps} />);
    expect(screen.getByText(/drop .py file here/i)).toBeInTheDocument();
  });

  it('shows uploading state', () => {
    render(
      <FileUploader
        {...defaultProps}
        uploadState={{ isUploading: true, progress: 50, error: null }}
      />
    );
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(
      <FileUploader
        {...defaultProps}
        uploadState={{ isUploading: false, progress: 0, error: 'Only .py files are allowed' }}
      />
    );
    expect(screen.getByText('Only .py files are allowed')).toBeInTheDocument();
  });

  it('calls onUpload when file is selected via click', () => {
    render(<FileUploader {...defaultProps} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['# test'], 'script.py', { type: 'text/x-python' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(defaultProps.onUpload).toHaveBeenCalledWith(file);
  });

  it('shows file type constraint text', () => {
    render(<FileUploader {...defaultProps} />);
    expect(screen.getByText(/\.py files only/i)).toBeInTheDocument();
  });

  it('handles drag over and drag leave', () => {
    render(<FileUploader {...defaultProps} />);
    const dropzone = screen.getByRole('button');
    fireEvent.dragOver(dropzone);
    expect(dropzone.className).toContain('border-purple-500');
    fireEvent.dragLeave(dropzone);
    expect(dropzone.className).not.toContain('border-purple-500');
  });

  it('handles file drop', () => {
    render(<FileUploader {...defaultProps} />);
    const dropzone = screen.getByRole('button');
    const file = new File(['# test'], 'script.py', { type: 'text/x-python' });
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });
    expect(defaultProps.onUpload).toHaveBeenCalledWith(file);
  });

  it('shows progress bar during upload', () => {
    const { container } = render(
      <FileUploader
        {...defaultProps}
        uploadState={{ isUploading: true, progress: 75, error: null }}
      />
    );
    const progressBar = container.querySelector('.bg-purple-500');
    expect(progressBar).toBeTruthy();
    expect(progressBar?.getAttribute('style')).toContain('75%');
  });

  it('disables dropzone during upload', () => {
    render(
      <FileUploader
        {...defaultProps}
        uploadState={{ isUploading: true, progress: 50, error: null }}
      />
    );
    const dropzone = screen.getByRole('button');
    expect(dropzone.className).toContain('pointer-events-none');
  });

  it('handles keyboard activation', () => {
    render(<FileUploader {...defaultProps} />);
    const dropzone = screen.getByRole('button');
    fireEvent.keyDown(dropzone, { key: 'Enter' });
  });
});
