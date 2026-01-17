-- Add policy for failed_login_attempts to allow inserts from edge functions
-- This table is intentionally restrictive - only service role can read
CREATE POLICY "Allow insert for tracking failed logins" 
ON public.failed_login_attempts 
FOR INSERT 
WITH CHECK (true);