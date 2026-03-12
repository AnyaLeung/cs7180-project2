-- Storage bucket for uploaded .py files.
-- Path convention: {user_id}/{file_id}.py (set by backend).
-- Private bucket; backend uses service_role (bypasses RLS).

INSERT INTO storage.buckets (id, name, public)
VALUES ('python-files', 'python-files', false)
ON CONFLICT (id) DO NOTHING;
