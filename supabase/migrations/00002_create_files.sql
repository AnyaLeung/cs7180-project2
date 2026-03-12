-- Files: one row per uploaded .py file per user.
-- RLS enabled in 00004; backend uses service role.

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_files_user_id ON files (user_id);

COMMENT ON TABLE files IS 'Uploaded Python files; storage_path is key in Supabase Storage.';
