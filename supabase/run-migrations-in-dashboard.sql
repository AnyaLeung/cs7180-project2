-- ============================================================
-- InstructScan: 一次性在 Supabase 网页里执行整份即可
-- 用法：Supabase Dashboard → SQL Editor → 新建 Query → 粘贴本文件 → Run
-- ============================================================

-- 1. users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 2. files
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files (user_id);

-- 3. scans
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files (id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  result_path TEXT NOT NULL,
  instruction_count INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scans_file_id ON scans (file_id);
CREATE INDEX IF NOT EXISTS idx_scans_expires_at ON scans (expires_at);

-- 4. RLS（仅防御，后端用 service role 绕过）
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- 5. Storage bucket（.py 文件）
INSERT INTO storage.buckets (id, name, public)
VALUES ('python-files', 'python-files', false)
ON CONFLICT (id) DO NOTHING;
