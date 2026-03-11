import { hoverTooltip, type Tooltip } from '@codemirror/view';
import { EditorView } from '@codemirror/view';
import { detectInstruction, generateContent, type InstructionAction } from '../hooks/useInstructionDetect';
import { createInstructionButtonsElement } from '../components/InstructionButtons';

function getLineText(view: EditorView, pos: number): { lineNumber: number; text: string } | null {
  const line = view.state.doc.lineAt(pos);
  return { lineNumber: line.number, text: line.text };
}

function isCommentLine(text: string): boolean {
  return text.trimStart().startsWith('#');
}

export function instructionHoverTooltip() {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastLineNumber: number | null = null;

  return hoverTooltip(
    (view, pos) => {
      const lineInfo = getLineText(view, pos);
      if (!lineInfo || !isCommentLine(lineInfo.text)) return null;

      if (lineInfo.lineNumber === lastLineNumber) return null;

      if (debounceTimer) clearTimeout(debounceTimer);

      return new Promise<Tooltip | null>((resolve) => {
        debounceTimer = setTimeout(async () => {
          const info = getLineText(view, pos);
          if (!info || !isCommentLine(info.text)) {
            resolve(null);
            return;
          }

          const isInstruction = await detectInstruction(info.text);
          if (!isInstruction) {
            resolve(null);
            return;
          }

          lastLineNumber = info.lineNumber;

          resolve({
            pos: view.state.doc.line(info.lineNumber).from,
            above: false,
            create: () => {
              let loading = false;

              const handleAction = async (action: InstructionAction) => {
                if (loading) return;
                loading = true;
                dom.replaceChildren(
                  createInstructionButtonsElement(handleAction, true)
                );

                const fileContent = view.state.doc.toString();
                const generated = await generateContent(info.text, action, fileContent);

                const currentLine = view.state.doc.line(info.lineNumber);
                const insertPos = currentLine.to;

                view.dispatch({
                  changes: { from: insertPos, insert: generated },
                });

                loading = false;
                lastLineNumber = null;
              };

              const dom = document.createElement('div');
              dom.className = 'cm-instruction-tooltip';
              dom.appendChild(createInstructionButtonsElement(handleAction, false));

              return { dom };
            },
          });
        }, 300);
      });
    },
    { hideOnChange: true, hoverTime: 100 }
  );
}

export const tooltipBaseTheme = EditorView.baseTheme({
  '.cm-tooltip.cm-instruction-tooltip': {
    backgroundColor: 'transparent',
    border: 'none',
  },
});
