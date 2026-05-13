CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  wellness_score NUMERIC,
  heart_rate NUMERIC,
  systolic NUMERIC,
  diastolic NUMERIC,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX leads_email_idx ON public.leads (email);
CREATE INDEX leads_created_at_idx ON public.leads (created_at DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can insert their own lead. No reads from client.
CREATE POLICY "Anyone can insert a lead"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);