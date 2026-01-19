-- Atualizar função para usar o schema correto da extensão pg_net
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT := 'https://rwpgswjvrotshybwevog.supabase.co';
BEGIN
  -- Call the edge function to send welcome email using extensions.net
  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
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
$$;