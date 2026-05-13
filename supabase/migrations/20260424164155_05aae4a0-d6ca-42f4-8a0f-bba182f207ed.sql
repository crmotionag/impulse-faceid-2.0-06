ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text;

DROP POLICY IF EXISTS "Anyone can insert a valid lead" ON public.leads;

CREATE POLICY "Anyone can insert a valid lead"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(email) >= 5 AND length(email) <= 255
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND full_name IS NOT NULL AND length(btrim(full_name)) >= 3 AND length(full_name) <= 120
  AND phone IS NOT NULL AND length(regexp_replace(phone, '\D', '', 'g')) >= 8 AND length(phone) <= 32
  AND (wellness_score IS NULL OR (wellness_score >= 0 AND wellness_score <= 100))
  AND (heart_rate IS NULL OR (heart_rate >= 20 AND heart_rate <= 250))
  AND (systolic IS NULL OR (systolic >= 40 AND systolic <= 260))
  AND (diastolic IS NULL OR (diastolic >= 20 AND diastolic <= 200))
  AND (user_agent IS NULL OR length(user_agent) <= 512)
);