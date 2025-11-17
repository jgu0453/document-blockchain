-- Drop all existing policies on public.documents
DO $$
DECLARE stmt text;
BEGIN
  SELECT string_agg(format('drop policy if exists %I on public.documents;', pol.policyname), ' ')
    INTO stmt
  FROM pg_policies pol
  WHERE pol.schemaname = 'public' AND pol.tablename = 'documents';
  IF stmt IS NOT NULL THEN EXECUTE stmt; END IF;
END$$;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Admin insert only
CREATE POLICY documents_admin_insert
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (auth.jwt()->'user_metadata'->>'role' = 'admin');

-- Admin read all
CREATE POLICY documents_admin_select
ON public.documents
FOR SELECT
TO authenticated
USING (auth.jwt()->'user_metadata'->>'role' = 'admin');

-- Students read their own
CREATE POLICY documents_student_select
ON public.documents
FOR SELECT
TO authenticated
USING (
  auth.jwt()->'user_metadata'->>'role' = 'student'
  AND student_id = auth.jwt()->'user_metadata'->>'studentId'
);