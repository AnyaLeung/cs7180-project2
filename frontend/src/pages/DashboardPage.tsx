import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { useFileUpload, type FileInfo } from '../hooks/useFileUpload';
import { FileUploader } from '../components/FileUploader';

export function DashboardPage() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const loadFiles = useCallback(async () => {
    try {
      const data = await api.get<FileInfo[]>('/api/files');
      setFiles(data);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const handleUploadSuccess = useCallback(
    (file: FileInfo) => {
      setFiles((prev) => [file, ...prev]);
    },
    []
  );

  const { uploadState, upload, clearError } = useFileUpload(handleUploadSuccess);

  async function handleDelete(id: string) {
    try {
      // Built-in example files are not stored in the backend;
      // removing them locally is enough so the UI responds.
      if (id.startsWith('example-')) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        return;
      }

      await api.del(`/api/files/${id}`);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch {
      /* ignore */
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
        <h1 className="text-xl font-bold italic text-purple-400">InstructScan</h1>
        <button
          onClick={logout}
          className="text-sm text-gray-400 hover:text-white"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold mb-4">Your Files</h2>

        <FileUploader
          uploadState={uploadState}
          onUpload={upload}
          onClearError={clearError}
        />

        <div className="mt-6 space-y-2">
          {loading && <p className="text-gray-500 text-sm">Loading files...</p>}

          {!loading && files.length === 0 && (
            <p className="text-gray-500 text-sm">No files yet. Upload a .py file to get started.</p>
          )}

          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg bg-gray-900 border border-gray-800 px-4 py-3 hover:border-gray-700 transition-colors"
            >
              <button
                onClick={() => navigate(`/editor/${f.id}`)}
                className="flex-1 text-left"
              >
                <span className="text-sm font-medium text-gray-200">{f.filename}</span>
                <span className="ml-3 text-xs text-gray-500">{formatSize(f.sizeBytes)}</span>
              </button>
              <button
                onClick={() => handleDelete(f.id)}
                className="ml-4 text-xs text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
