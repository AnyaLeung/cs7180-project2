import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { detectInstruction, generateContent } from '../../hooks/useInstructionDetect';

vi.mock('../../hooks/useInstructionDetect', () => ({
  detectInstruction: vi.fn().mockResolvedValue(false),
  generateContent: vi.fn().mockResolvedValue('\n# generated\n'),
}));

vi.mock('../../components/InstructionButtons', () => ({
  createInstructionButtonsElement: (_handler: unknown, loading: boolean) => {
    const el = document.createElement('div');
    el.className = loading ? 'mock-buttons-loading' : 'mock-buttons';
    return el;
  },
}));

import { instructionHoverTooltip, tooltipBaseTheme } from '../../utils/hoverExtension';

const mockDetect = vi.mocked(detectInstruction);
const mockGenerate = vi.mocked(generateContent);

function createView(doc: string) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const extensions = instructionHoverTooltip();
  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [...extensions, tooltipBaseTheme],
    }),
    parent: container,
  });
  return { view, container };
}

describe('hoverExtension', () => {
  let resetView: EditorView | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockDetect.mockResolvedValue(false);
    mockGenerate.mockResolvedValue('\n# generated\n');

    // Reset module-level lastDetectedLine by moving cursor to a non-comment line
    const container = document.createElement('div');
    document.body.appendChild(container);
    resetView = new EditorView({
      state: EditorState.create({
        doc: 'code\n',
        extensions: instructionHoverTooltip(),
      }),
      parent: container,
    });
    resetView.dispatch({ selection: { anchor: 0 } });
  });

  afterEach(() => {
    resetView?.destroy();
    resetView = null;
    vi.useRealTimers();
  });

  describe('instructionHoverTooltip', () => {
    it('returns an array of 2 extensions', () => {
      const extensions = instructionHoverTooltip();
      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions.length).toBe(2);
    });

    it('can be used in EditorState without errors', () => {
      expect(() => {
        EditorState.create({
          doc: '# test\nprint(1)\n',
          extensions: instructionHoverTooltip(),
        });
      }).not.toThrow();
    });
  });

  describe('tooltipBaseTheme', () => {
    it('is a valid extension', () => {
      expect(tooltipBaseTheme).toBeDefined();
    });

    it('can be used in EditorState', () => {
      expect(() => {
        EditorState.create({ doc: '# test', extensions: [tooltipBaseTheme] });
      }).not.toThrow();
    });
  });

  describe('cursor listener', () => {
    it('does nothing when cursor moves to non-comment line', async () => {
      const { view } = createView('# comment\ncode line\n');

      view.dispatch({ selection: { anchor: 15 } });
      await vi.advanceTimersByTimeAsync(500);

      expect(mockDetect).not.toHaveBeenCalled();
      view.destroy();
    });

    it('triggers detection after debounce on comment line', async () => {
      const { view } = createView('# Step 1: Load data\nprint(1)\n');

      view.dispatch({ selection: { anchor: 5 } });
      expect(mockDetect).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(350);

      expect(mockDetect).toHaveBeenCalledWith('# Step 1: Load data');
      view.destroy();
    });

    it('clears tooltip when cursor moves from comment to code', async () => {
      mockDetect.mockResolvedValue(true);
      const { view } = createView('# comment\nnon comment\n');

      view.dispatch({ selection: { anchor: 2 } });
      await vi.advanceTimersByTimeAsync(350);

      view.dispatch({ selection: { anchor: 15 } });
      await vi.advanceTimersByTimeAsync(50);

      view.destroy();
    });

    it('skips re-detection on same line', async () => {
      mockDetect.mockResolvedValue(false);
      const { view } = createView('# Step 1: Load data from CSV\nprint(1)\n');

      view.dispatch({ selection: { anchor: 2 } });
      await vi.advanceTimersByTimeAsync(350);
      expect(mockDetect).toHaveBeenCalledTimes(1);

      view.dispatch({ selection: { anchor: 5 } });
      await vi.advanceTimersByTimeAsync(350);
      expect(mockDetect).toHaveBeenCalledTimes(1);
      view.destroy();
    });

    it('debounces rapid cursor changes', async () => {
      const { view } = createView('# line 1\n# line 2\n# line 3\n');

      view.dispatch({ selection: { anchor: 2 } });
      await vi.advanceTimersByTimeAsync(100);
      view.dispatch({ selection: { anchor: 12 } });
      await vi.advanceTimersByTimeAsync(100);
      view.dispatch({ selection: { anchor: 22 } });
      await vi.advanceTimersByTimeAsync(350);

      expect(mockDetect).toHaveBeenCalledTimes(1);
      view.destroy();
    });

    it('handles detectInstruction returning true', async () => {
      mockDetect.mockResolvedValue(true);
      const { view } = createView('# Step 1: Load data\nprint(1)\n');

      view.dispatch({ selection: { anchor: 5 } });
      await vi.advanceTimersByTimeAsync(350);

      expect(mockDetect).toHaveBeenCalledWith('# Step 1: Load data');
      view.destroy();
    });

    it('handles detectInstruction returning false', async () => {
      mockDetect.mockResolvedValue(false);
      const { view } = createView('# just a comment\nprint(1)\n');

      view.dispatch({ selection: { anchor: 5 } });
      await vi.advanceTimersByTimeAsync(350);

      expect(mockDetect).toHaveBeenCalledTimes(1);
      view.destroy();
    });

    it('handles detectInstruction errors gracefully', async () => {
      mockDetect.mockRejectedValue(new Error('API fail'));
      const { view } = createView('# Step 1\ncode\n');

      view.dispatch({ selection: { anchor: 2 } });
      await vi.advanceTimersByTimeAsync(350);

      expect(mockDetect).toHaveBeenCalled();
      view.destroy();
    });

    it('cancels debounce when moving to non-comment', async () => {
      const { view } = createView('# comment\nnon comment\n');

      view.dispatch({ selection: { anchor: 2 } });
      await vi.advanceTimersByTimeAsync(100);

      view.dispatch({ selection: { anchor: 15 } });
      await vi.advanceTimersByTimeAsync(350);

      expect(mockDetect).not.toHaveBeenCalled();
      view.destroy();
    });

    it('detects multiple different comment lines sequentially', async () => {
      mockDetect.mockResolvedValue(false);
      const { view } = createView('# line A\n# line B\ncode\n');

      view.dispatch({ selection: { anchor: 2 } });
      await vi.advanceTimersByTimeAsync(350);
      expect(mockDetect).toHaveBeenCalledTimes(1);

      view.dispatch({ selection: { anchor: 12 } });
      await vi.advanceTimersByTimeAsync(350);
      expect(mockDetect).toHaveBeenCalledTimes(2);
      view.destroy();
    });

    it('handles doc changes on comment lines', async () => {
      mockDetect.mockResolvedValue(false);
      const { view } = createView('# initial\ncode\n');

      view.dispatch({
        changes: { from: 0, to: 9, insert: '# modified' },
        selection: { anchor: 5 },
      });
      await vi.advanceTimersByTimeAsync(350);

      expect(mockDetect).toHaveBeenCalled();
      view.destroy();
    });
  });

  describe('integration', () => {
    it('creates EditorView with tooltip extensions', () => {
      const { view } = createView('# Step 1\nimport pandas\n');
      expect(view).toBeTruthy();
      expect(view.state.doc.toString()).toContain('Step 1');
      view.destroy();
    });
  });
});
