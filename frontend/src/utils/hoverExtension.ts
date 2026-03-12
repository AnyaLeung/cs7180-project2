import { EditorView, showTooltip, type Tooltip } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { detectInstruction, generateContent, type InstructionAction } from '../hooks/useInstructionDetect';
import { createInstructionButtonsElement } from '../components/InstructionButtons';

const setTooltip = StateEffect.define<Tooltip | null>();

const tooltipField = StateField.define<Tooltip | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setTooltip)) return e.value;
    }
    return value;
  },
  provide: (f) => showTooltip.from(f),
});

function isCommentLine(text: string): boolean {
  return text.trimStart().startsWith('#');
}

let lastDetectedLine: number | null = null;
let detecting = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const cursorListener = EditorView.updateListener.of((update) => {
  if (!update.selectionSet && !update.docChanged) return;

  const view = update.view;
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);

  if (!isCommentLine(line.text)) {
    if (lastDetectedLine !== null) {
      lastDetectedLine = null;
      view.dispatch({ effects: setTooltip.of(null) });
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    return;
  }

  if (line.number === lastDetectedLine) return;

  // Clear previous tooltip while detecting new line
  view.dispatch({ effects: setTooltip.of(null) });

  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    void detectAndShow(view, line.number, line.text, line.from);
  }, 300);
});

async function detectAndShow(
  view: EditorView,
  lineNumber: number,
  text: string,
  lineFrom: number
) {
  if (detecting) return;
  detecting = true;

  try {
    const isInstr = await detectInstruction(text);

    // Verify cursor is still on the same line after async call
    const currentPos = view.state.selection.main.head;
    const currentLine = view.state.doc.lineAt(currentPos);
    if (currentLine.number !== lineNumber) {
      detecting = false;
      return;
    }

    if (!isInstr) {
      lastDetectedLine = lineNumber;
      detecting = false;
      return;
    }

    lastDetectedLine = lineNumber;

    const tooltip: Tooltip = {
      pos: lineFrom,
      above: false,
      strictSide: true,
      arrow: false,
      create: () => {
        let loading = false;

        const handleAction = async (action: InstructionAction) => {
          if (loading) return;
          loading = true;
          dom.replaceChildren(createInstructionButtonsElement(handleAction, true));

          const fileContent = view.state.doc.toString();
          const generated = await generateContent(text, action, fileContent);

          const targetLine = view.state.doc.line(lineNumber);
          view.dispatch({
            changes: { from: targetLine.to, insert: generated },
            effects: setTooltip.of(null),
          });

          loading = false;
          lastDetectedLine = null;
        };

        const dom = document.createElement('div');
        dom.className = 'cm-instruction-tooltip';
        dom.appendChild(createInstructionButtonsElement(handleAction, false));
        return { dom };
      },
    };

    view.dispatch({ effects: setTooltip.of(tooltip) });
  } catch {
    // detection failed
  } finally {
    detecting = false;
  }
}

export function instructionHoverTooltip() {
  return [tooltipField, cursorListener];
}

export const tooltipBaseTheme = EditorView.baseTheme({
  '.cm-tooltip.cm-instruction-tooltip': {
    backgroundColor: 'transparent',
    border: 'none',
    zIndex: '100',
  },
});
