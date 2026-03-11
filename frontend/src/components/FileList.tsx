import type { FileInfo } from '../hooks/useFileUpload';

interface FileListProps {
  files: FileInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function FileList({ files, selectedId, onSelect }: FileListProps) {
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
    </aside>
  );
}
