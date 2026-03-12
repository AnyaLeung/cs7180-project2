import { useRef, useCallback, useState } from 'react';
import type { FileInfo } from '../hooks/useFileUpload';
import type { UploadState } from '../hooks/useFileUpload';
import { api } from '../utils/api';

interface FileListProps {
  files: FileInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpload?: (file: File) => void;
  uploadState?: UploadState;
}

export function FileList({ files, selectedId, onSelect, onUpload, uploadState }: FileListProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onUpload) onUpload(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [onUpload]
  );

  const handleDownloadInstructions = useCallback(async (file: FileInfo) => {
    try {
      setDownloadingId(file.id);
      const scans = await api.get<{ id: string; scannedAt: string; instructionCount: number }[]>(
        `/api/files/${file.id}/scans`
      );
      const latest = scans[0];
      if (!latest) {
        alert('No scan history for this file yet. Run Scan in the editor first.');
        return;
      }

      const text = await api.getText(`/api/scans/${latest.id}/download`);
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.fileName.replace(/[^a-zA-Z0-9._-]+/g, '_')}-instructions.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      alert(msg);
    } finally {
      setDownloadingId(null);
    }
  }, []);

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
          <div
            key={f.id}
            className={`w-full px-3 py-2 text-sm rounded transition-colors flex items-center justify-between gap-2 ${
              selectedId === f.id
                ? 'bg-gray-800 text-white border-l-2 border-purple-500'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            <button
              onClick={() => onSelect(f.id)}
              className="flex-1 text-left truncate"
              title={f.fileName}
            >
              {f.fileName}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                void handleDownloadInstructions(f);
              }}
              disabled={downloadingId === f.id}
              className="text-xs text-gray-300 hover:text-white disabled:opacity-50"
              title="download whole file instructions"
              aria-label="download whole file instructions"
            >
              {downloadingId === f.id ? (
                '...'
              ) : (
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M12 15V3" />
                </svg>
              )}
            </button>
          </div>
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
