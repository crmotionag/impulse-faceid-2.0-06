DROP POLICY IF EXISTS "Anyone can insert a lead" ON public.leads;

CREATE POLICY "Anyone can insert a valid lead"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(email) BETWEEN 5 AND 255
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND (wellness_score IS NULL OR wellness_score BETWEEN 0 AND 100)
    AND (heart_rate IS NULL OR heart_rate BETWEEN 20 AND 250)
    AND (systolic IS NULL OR systolic BETWEEN 40 AND 260)
    AND (diastolic IS NULL OR diastolic BETWEEN 20 AND 200)
    AND (user_agent IS NULL OR length(user_agent) <= 512)
  );