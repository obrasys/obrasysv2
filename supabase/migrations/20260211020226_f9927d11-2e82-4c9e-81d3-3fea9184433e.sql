
-- Create feedback_pesquisa table
CREATE TABLE public.feedback_pesquisa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  nome TEXT,
  nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario TEXT,
  token TEXT NOT NULL UNIQUE,
  trial_extendido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_pesquisa ENABLE ROW LEVEL SECURITY;

-- Super admins can view all feedback
CREATE POLICY "Super admins can view all feedback"
ON public.feedback_pesquisa
FOR SELECT
USING (is_super_admin());

-- Allow insert via edge function (service role)
-- No public insert policy needed since we use edge function with service role

-- Allow users to view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.feedback_pesquisa
FOR SELECT
USING (auth.uid() = user_id);
