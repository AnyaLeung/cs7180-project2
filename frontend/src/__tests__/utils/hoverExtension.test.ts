import { describe, it, expect, vi } from 'vitest';
import { instructionHoverTooltip, tooltipBaseTheme } from '../../utils/hoverExtension';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

function isCommentLine(text: string): boolean {
  return text.trimStart().startsWith('#');
}

describe('isCommentLine (hoverExtension logic)', () => {
  it('detects simple comment lines', () => {
    expect(isCommentLine('# Step 1')).toBe(true);
    expect(isCommentLine('# Load data')).toBe(true);
  });

  it('detects indented comments', () => {
    expect(isCommentLine('  # indented comment')).toBe(true);
    expect(isCommentLine('\t# tab indented')).toBe(true);
  });

  it('rejects non-comment lines', () => {
    expect(isCommentLine('print("hello")')).toBe(false);
    expect(isCommentLine('x = 1  # inline comment')).toBe(false);
    expect(isCommentLine('import pandas as pd')).toBe(false);
  });

  it('rejects empty lines', () => {
    expect(isCommentLine('')).toBe(false);
    expect(isCommentLine('   ')).toBe(false);
  });

  it('handles edge cases', () => {
    expect(isCommentLine('#')).toBe(true);
    expect(isCommentLine('##')).toBe(true);
    expect(isCommentLine('#!')).toBe(true);
  });
});

describe('instructionHoverTooltip', () => {
  it('returns an array of extensions', () => {
    const extensions = instructionHoverTooltip();
    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBe(2);
  });

  it('can be used in an EditorState without errors', () => {
    const extensions = instructionHoverTooltip();
    expect(() => {
      EditorState.create({
        doc: '# test\nprint(1)\n',
        extensions,
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
      EditorState.create({
        doc: '# test',
        extensions: [tooltipBaseTheme],
      });
    }).not.toThrow();
  });
});

describe('hoverExtension integration', () => {
  it('creates an EditorView with tooltip extensions', () => {
    const container = document.createElement('div');
    const extensions = instructionHoverTooltip();

    const view = new EditorView({
      state: EditorState.create({
        doc: '# Step 1: Load data\nimport pandas\n',
        extensions: [...extensions, tooltipBaseTheme],
      }),
      parent: container,
    });

    expect(view).toBeTruthy();
    expect(view.state.doc.toString()).toContain('Step 1');
    view.destroy();
  });

  it('editor responds to cursor changes without throwing', () => {
    vi.mock('../../hooks/useInstructionDetect', () => ({
      detectInstruction: vi.fn().mockResolvedValue(false),
      generateContent: vi.fn().mockResolvedValue('# generated'),
    }));

    const container = document.createElement('div');
    const extensions = instructionHoverTooltip();

    const view = new EditorView({
      state: EditorState.create({
        doc: '# comment line\ncode line\n',
        extensions: [...extensions, tooltipBaseTheme],
      }),
      parent: container,
    });

    expect(() => {
      view.dispatch({
        selection: { anchor: 0 },
      });
    }).not.toThrow();

    expect(() => {
      view.dispatch({
        selection: { anchor: 15 },
      });
    }).not.toThrow();

    view.destroy();
  });
});
