import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { useFileUpload, type FileInfo } from '../hooks/useFileUpload';
import { FileList } from '../components/FileList';
import { CodeEditor } from '../components/CodeEditor';
import { instructionHoverTooltip, tooltipBaseTheme } from '../utils/hoverExtension';

interface FileContent {
  content: string;
}

export function EditorPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [files, setFiles] = useState<FileInfo[]>([]);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFiles() {
      try {
        const data = await api.get<FileInfo[]>('/api/files');
        setFiles(data);
      } catch {
        setFiles([]);
      }
    }
    void loadFiles();
  }, []);

  const handleUploadSuccess = useCallback(
    (file: FileInfo) => {
      setFiles((prev) => [file, ...prev]);
      navigate(`/editor/${file.id}`);
    },
    [navigate]
  );

  const { uploadState, upload, clearError } = useFileUpload(handleUploadSuccess);

  const handleUploadFile = useCallback(
    (file: File) => {
      clearError();
      void upload(file);
    },
    [upload, clearError]
  );

  useEffect(() => {
    if (!fileId) return;

    setLoading(true);
    api
      .get<FileContent>(`/api/files/${fileId}/content`)
      .then((data) => setContent(data.content))
      .catch(() => setContent('# Failed to load file'))
      .finally(() => setLoading(false));
  }, [fileId]);

  const handleSelectFile = useCallback(
    (id: string) => {
      navigate(`/editor/${id}`);
    },
    [navigate]
  );

  const editorExtensions = useMemo(
    () => [instructionHoverTooltip(), tooltipBaseTheme],
    []
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
        <h1
          className="text-xl font-bold italic text-purple-400 cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          InstructScan
        </h1>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-white">
          Sign out
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <FileList
          files={files}
          selectedId={fileId ?? null}
          onSelect={handleSelectFile}
          onUpload={handleUploadFile}
          uploadState={uploadState}
        />

        <main className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : (
            <CodeEditor content={content} extensions={editorExtensions} />
          )}
        </main>
      </div>
    </div>
  );
}
