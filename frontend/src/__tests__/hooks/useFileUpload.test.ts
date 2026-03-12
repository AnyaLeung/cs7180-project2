import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from '../../hooks/useFileUpload';

vi.mock('../../utils/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

import { api } from '../../utils/api';
const mockPost = vi.mocked(api.post);

function createFile(name: string, size: number, content = '# test'): File {
  const blob = new Blob([content], { type: 'text/x-python' });
  Object.defineProperty(blob, 'size', { value: size });
  Object.defineProperty(blob, 'name', { value: name });
  return blob as File;
}

describe('useFileUpload', () => {
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-.py files', async () => {
    const { result } = renderHook(() => useFileUpload(onSuccess));
    const file = createFile('readme.txt', 100);

    await act(async () => {
      await result.current.upload(file);
    });

    expect(result.current.uploadState.error).toBe('Only .py files are allowed');
    expect(mockPost).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('rejects files exceeding 5 MB', async () => {
    const { result } = renderHook(() => useFileUpload(onSuccess));
    const file = createFile('big.py', 5 * 1024 * 1024 + 1);

    await act(async () => {
      await result.current.upload(file);
    });

    expect(result.current.uploadState.error).toBe('File exceeds 5 MB limit');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects empty files', async () => {
    const { result } = renderHook(() => useFileUpload(onSuccess));
    const file = createFile('empty.py', 0);

    await act(async () => {
      await result.current.upload(file);
    });

    expect(result.current.uploadState.error).toBe('File is empty');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('uploads valid .py file and calls onSuccess', async () => {
    const mockResult = { id: 'f1', fileName: 'script.py', sizeBytes: 100, uploadedAt: '2026-01-01' };
    mockPost.mockResolvedValueOnce(mockResult);

    const { result } = renderHook(() => useFileUpload(onSuccess));
    const file = createFile('script.py', 100);

    await act(async () => {
      await result.current.upload(file);
    });

    expect(mockPost).toHaveBeenCalledWith('/api/files', expect.any(FormData));
    expect(onSuccess).toHaveBeenCalledWith(mockResult);
    expect(result.current.uploadState.error).toBeNull();
    expect(result.current.uploadState.progress).toBe(100);
  });

  it('sets error on API failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useFileUpload(onSuccess));
    const file = createFile('script.py', 100);

    await act(async () => {
      await result.current.upload(file);
    });

    expect(result.current.uploadState.error).toBe('Network error');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('clearError resets error state', async () => {
    const { result } = renderHook(() => useFileUpload(onSuccess));
    const file = createFile('readme.txt', 100);

    await act(async () => {
      await result.current.upload(file);
    });
    expect(result.current.uploadState.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });
    expect(result.current.uploadState.error).toBeNull();
  });
});
