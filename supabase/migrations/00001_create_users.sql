-- Users table (custom auth; not Supabase auth.users)
-- Backend uses service role; no RLS on this table.

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

COMMENT ON TABLE users IS 'App users; auth via backend JWT. Backend only (service role).';
