-- Update send_welcome_email function to use anon key instead of service role key
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT := 'https://rwpgswjvrotshybwevog.supabase.co';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3cGdzd2p2cm90c2h5Yndldm9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzYwMTEsImV4cCI6MjA4NDI1MjAxMX0.ePiA34mkLw05wi0jYbVvczjtJsQLNddGw1c-_g0q-o0';
BEGIN
  -- Call the edge function to send welcome email
  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'email', NEW.email,
      'nome', NEW.nome
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the profile creation
    RAISE WARNING 'Failed to send welcome email: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;