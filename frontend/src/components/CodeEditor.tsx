import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState, type Extension } from '@codemirror/state';

interface CodeEditorProps {
  content: string;
  extensions?: Extension[];
  onViewReady?: (view: EditorView) => void;
}

export function CodeEditor({ content, extensions = [], onViewReady }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (viewRef.current) {
      viewRef.current.destroy();
    }

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        python(),
        oneDark,
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
        ...extensions,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    onViewReady?.(view);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  return <div ref={containerRef} className="h-full w-full" />;
}
