import { useCallback, useRef, useState, type DragEvent } from 'react';
import type { UploadState } from '../hooks/useFileUpload';

interface FileUploaderProps {
  uploadState: UploadState;
  onUpload: (file: File) => void;
  onClearError: () => void;
}

export function FileUploader({ uploadState, onUpload, onClearError }: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (file) {
        onClearError();
        onUpload(file);
      }
    },
    [onUpload, onClearError]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
          isDragOver
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-gray-700 hover:border-gray-500'
        } ${uploadState.isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-sm text-gray-400">
          {uploadState.isUploading ? 'Uploading...' : 'Drop .py file here or click to browse'}
        </span>
        <span className="text-xs text-gray-600 mt-1">.py files only, up to 5 MB</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".py"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />

      {uploadState.isUploading && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-gray-800">
          <div
            className="h-1.5 rounded-full bg-purple-500 transition-all duration-200"
            style={{ width: `${uploadState.progress}%` }}
          />
        </div>
      )}

      {uploadState.error && (
        <div className="mt-3 rounded bg-red-900/30 border border-red-800 px-3 py-2">
          <p className="text-xs text-red-400">{uploadState.error}</p>
        </div>
      )}
    </div>
  );
}
