-- Scans: one row per LLM scan of a file.
-- result_path: key to scan result .txt in Storage.
-- expires_at: scanned_at + 30 days (set by app or trigger).
-- RLS enabled in 00004; backend uses service role.

CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files (id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  result_path TEXT NOT NULL,
  instruction_count INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_scans_file_id ON scans (file_id);
CREATE INDEX idx_scans_expires_at ON scans (expires_at);

COMMENT ON TABLE scans IS 'Per-file scan results; result_path points to .txt in Storage.';
