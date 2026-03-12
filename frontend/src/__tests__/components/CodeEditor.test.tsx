import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CodeEditor } from '../../components/CodeEditor';

describe('CodeEditor', () => {
  it('renders a container div', () => {
    const { container } = render(<CodeEditor content="# hello" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('creates a CodeMirror instance with content', () => {
    const { container } = render(<CodeEditor content="import pandas as pd" />);
    const cmContent = container.querySelector('.cm-content');
    expect(cmContent).toBeTruthy();
    expect(cmContent?.textContent).toContain('import pandas as pd');
  });

  it('accepts extensions prop without crashing', () => {
    expect(() => {
      render(<CodeEditor content="# test" extensions={[]} />);
    }).not.toThrow();
  });
});
