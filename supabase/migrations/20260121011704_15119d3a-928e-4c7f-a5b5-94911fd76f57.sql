CREATE OR REPLACE FUNCTION public.send_welcome_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url TEXT := 'https://rwpgswjvrotshybwevog.supabase.co';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3cGdzd2p2cm90c2h5Yndldm9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzYwMTEsImV4cCI6MjA4NDI1MjAxMX0.ePiA34mkLw05wi0jYbVvczjtJsQLNddGw1c-_g0q-o0';
  request_body JSONB;
  request_headers JSONB;
BEGIN
  -- Preparar o body da requisição
  request_body := jsonb_build_object(
    'email', NEW.email,
    'nome', NEW.nome
  );
  
  -- Preparar os headers
  request_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || anon_key
  );
  
  -- Usar net.http_post com a assinatura correta: (url, body, params, headers, timeout)
  PERFORM net.http_post(
    supabase_url || '/functions/v1/send-welcome-email',
    request_body,
    '{}'::jsonb,
    request_headers,
    5000
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send welcome email: %', SQLERRM;
    RETURN NEW;
END;
$function$;