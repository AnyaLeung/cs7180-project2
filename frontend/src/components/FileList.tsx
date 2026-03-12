import { useRef, useCallback } from 'react';
import type { FileInfo } from '../hooks/useFileUpload';
import type { UploadState } from '../hooks/useFileUpload';

interface FileListProps {
  files: FileInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpload?: (file: File) => void;
  uploadState?: UploadState;
}

export function FileList({ files, selectedId, onSelect, onUpload, uploadState }: FileListProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onUpload) onUpload(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [onUpload]
  );

  return (
    <aside className="w-48 flex-shrink-0 border-r border-gray-800 flex flex-col bg-gray-950">
      <div className="px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Files
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {files.length === 0 && (
          <p className="px-3 py-2 text-xs text-gray-600">No files</p>
        )}
        {files.map((f) => (
          <button
            key={f.id}
            onClick={() => onSelect(f.id)}
            className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
              selectedId === f.id
                ? 'bg-gray-800 text-white border-l-2 border-purple-500'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {f.fileName}
          </button>
        ))}
      </div>

      {onUpload && (
        <div className="px-3 py-3 border-t border-gray-800">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploadState?.isUploading}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {uploadState?.isUploading ? 'Uploading...' : 'Open new file'}
          </button>
          {uploadState?.error && (
            <p className="mt-1.5 text-xs text-red-400">{uploadState.error}</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".py"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}
    </aside>
  );
}
