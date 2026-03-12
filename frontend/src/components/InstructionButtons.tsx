import type { InstructionAction } from '../hooks/useInstructionDetect';

interface InstructionButtonsProps {
  onAction: (action: InstructionAction) => void;
  loading: boolean;
}

const BUTTONS: { action: InstructionAction; label: string; icon: string }[] = [
  { action: 'write-code', label: 'Write Code', icon: '▶' },
  { action: 'detail-plan', label: 'Detail Plan', icon: '📋' },
  { action: 'alternative-plan', label: 'Alternative', icon: '🔄' },
];

// eslint-disable-next-line react-refresh/only-export-components
export function createInstructionButtonsElement(
  onAction: (action: InstructionAction) => void,
  loading: boolean
): HTMLElement {
  const container = document.createElement('div');
  container.className =
    'flex gap-1 p-1 rounded-lg bg-gray-800 border border-gray-700 shadow-xl';

  for (const btn of BUTTONS) {
    const button = document.createElement('button');
    button.className =
      'flex items-center gap-1 px-2 py-1 text-xs rounded font-medium transition-colors ' +
      (loading
        ? 'text-gray-500 cursor-not-allowed'
        : 'text-gray-300 hover:bg-purple-600 hover:text-white cursor-pointer');
    button.disabled = loading;
    button.textContent = `${btn.icon} ${btn.label}`;
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!loading) onAction(btn.action);
    });
    container.appendChild(button);
  }

  return container;
}

export function InstructionButtons({ onAction, loading }: InstructionButtonsProps) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-gray-800 border border-gray-700 shadow-xl">
      {BUTTONS.map((btn) => (
        <button
          key={btn.action}
          onClick={() => onAction(btn.action)}
          disabled={loading}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded font-medium transition-colors ${
            loading
              ? 'text-gray-500 cursor-not-allowed'
              : 'text-gray-300 hover:bg-purple-600 hover:text-white'
          }`}
        >
          <span>{btn.icon}</span>
          {btn.label}
        </button>
      ))}
    </div>
  );
}
