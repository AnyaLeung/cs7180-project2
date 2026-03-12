/**
 * Parse Python source and return comment lines (lines starting with #, optional leading whitespace).
 * Line numbers are 1-based for editor display.
 */
export interface CommentLine {
  lineNumber: number;
  commentText: string;
}

export function parseCommentLines(content: string): CommentLine[] {
  const lines = content.split(/\r?\n/);
  const result: CommentLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    if (trimmed.startsWith('#')) {
      result.push({
        lineNumber: i + 1,
        commentText: line.trimEnd(),
      });
    }
  }

  return result;
}
