-- RLS: defensive only. Backend uses service_role (bypasses RLS).
-- No permissive policies for anon/authenticated => no direct client access to rows.

ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- No policies added: anon/authenticated get no rows.
-- Service role (backend) bypasses RLS and enforces user_id in app layer.

COMMENT ON TABLE files IS 'Uploaded Python files; RLS on, backend-only access via service role.';
COMMENT ON TABLE scans IS 'Scan results; RLS on, backend-only access via service role.';
