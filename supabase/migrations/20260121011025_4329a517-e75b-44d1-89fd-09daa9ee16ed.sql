-- Remover o trigger duplicado da tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_subscriber ON auth.users;

-- Remover a função que já não será usada
DROP FUNCTION IF EXISTS public.handle_new_subscriber();