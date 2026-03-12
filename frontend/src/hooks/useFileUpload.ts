import { useState, useCallback } from 'react';
import { api } from '../utils/api';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface FileInfo {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

function validateFile(file: File): string | null {
  if (!file.name.endsWith('.py')) return 'Only .py files are allowed';
  if (file.size > MAX_FILE_SIZE) return `File exceeds 5 MB limit`;
  if (file.size === 0) return 'File is empty';
  return null;
}

export function useFileUpload(onSuccess: (file: FileInfo) => void) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const upload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setUploadState({ isUploading: false, progress: 0, error: validationError });
        return;
      }

      setUploadState({ isUploading: true, progress: 0, error: null });

      try {
        const formData = new FormData();
        formData.append('file', file);
        const result = await api.post<FileInfo>('/api/files', formData);
        setUploadState({ isUploading: false, progress: 100, error: null });
        onSuccess(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploadState({ isUploading: false, progress: 0, error: message });
      }
    },
    [onSuccess]
  );

  const clearError = useCallback(() => {
    setUploadState((s) => ({ ...s, error: null }));
  }, []);

  return { uploadState, upload, clearError };
}
