import { describe, it, expect } from 'vitest';
import { parseCommentLines } from '../services/commentParser';

describe('parseCommentLines', () => {
  it('parses standard comment lines', () => {
    const content = '# Step 1: Load data\nimport pandas as pd\n# Step 2: Clean data\n';
    const result = parseCommentLines(content);
    expect(result).toEqual([
      { lineNumber: 1, commentText: '# Step 1: Load data' },
      { lineNumber: 3, commentText: '# Step 2: Clean data' },
    ]);
  });

  it('handles indented comments', () => {
    const content = 'def foo():\n  # inside function\n  pass\n';
    const result = parseCommentLines(content);
    expect(result).toEqual([
      { lineNumber: 2, commentText: '  # inside function' },
    ]);
  });

  it('returns empty array for file with no comments', () => {
    const content = 'import os\nprint("hello")\nx = 1\n';
    expect(parseCommentLines(content)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseCommentLines('')).toEqual([]);
  });

  it('handles file with only comments', () => {
    const content = '# line 1\n# line 2\n# line 3\n';
    const result = parseCommentLines(content);
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ lineNumber: 3, commentText: '# line 3' });
  });

  it('ignores inline comments (# not at start of trimmed line)', () => {
    const content = 'x = 1  # inline comment\ny = 2  # another\n';
    expect(parseCommentLines(content)).toEqual([]);
  });

  it('handles comment with no space after #', () => {
    const content = '#no space\n#!shebang\n';
    const result = parseCommentLines(content);
    expect(result).toEqual([
      { lineNumber: 1, commentText: '#no space' },
      { lineNumber: 2, commentText: '#!shebang' },
    ]);
  });

  it('handles Windows line endings (\\r\\n)', () => {
    const content = '# first\r\ncode\r\n# second\r\n';
    const result = parseCommentLines(content);
    expect(result).toHaveLength(2);
    expect(result[0].lineNumber).toBe(1);
    expect(result[1].lineNumber).toBe(3);
  });

  it('trims trailing whitespace from comment text', () => {
    const content = '# trailing spaces   \n';
    const result = parseCommentLines(content);
    expect(result[0].commentText).toBe('# trailing spaces');
  });
});
