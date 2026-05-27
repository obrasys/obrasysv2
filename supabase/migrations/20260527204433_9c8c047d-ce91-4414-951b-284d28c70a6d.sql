
-- FIX CRÍTICO: Vazamento de dados - remover joaopatricioccpereira@pm.me da organização do fundador (ImoSuite)
-- A migração 20260527194829 erradamente moveu-o para a org do fundador (riquebeze@gmail.com),
-- dando-lhe acesso admin a todos os orçamentos, obras e dados da organização do fundador.

-- 1. Remover as permissões de módulo dele na org errada
DELETE FROM public.member_module_permissions
WHERE member_id IN (
  SELECT id FROM public.organization_members
  WHERE user_id = '4712840b-a88c-45c3-8f1a-4bff589080ed'
    AND organization_id = '305a7ef8-f8a3-46a2-9ec5-4699ee9297f2'
);

-- 2. Remover acesso a projetos na org errada
DELETE FROM public.member_project_access
WHERE member_id IN (
  SELECT id FROM public.organization_members
  WHERE user_id = '4712840b-a88c-45c3-8f1a-4bff589080ed'
    AND organization_id = '305a7ef8-f8a3-46a2-9ec5-4699ee9297f2'
);

-- 3. Remover o membership errado
DELETE FROM public.organization_members
WHERE user_id = '4712840b-a88c-45c3-8f1a-4bff589080ed'
  AND organization_id = '305a7ef8-f8a3-46a2-9ec5-4699ee9297f2';

-- 4. Criar nova organização própria para ele
DO $$
DECLARE
  v_new_org_id uuid;
BEGIN
  -- Verificar se ele já tem alguma org própria
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = '4712840b-a88c-45c3-8f1a-4bff589080ed'
  ) THEN
    INSERT INTO public.organizations (nome, owner_user_id)
    VALUES ('Joao Pereira - Empresa', '4712840b-a88c-45c3-8f1a-4bff589080ed')
    RETURNING id INTO v_new_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role, member_status, obra_scope)
    VALUES (v_new_org_id, '4712840b-a88c-45c3-8f1a-4bff589080ed', 'admin', 'active', 'all');
  END IF;
END $$;
