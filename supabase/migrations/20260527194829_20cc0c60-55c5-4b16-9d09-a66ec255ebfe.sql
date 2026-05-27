
DELETE FROM public.organization_members
WHERE user_id = '4712840b-a88c-45c3-8f1a-4bff589080ed'
  AND organization_id = '50e98cf1-df09-4f97-9b47-9f61edaeb25f';

INSERT INTO public.organization_members (user_id, organization_id, role, member_status, obra_scope)
VALUES ('4712840b-a88c-45c3-8f1a-4bff589080ed',
        '305a7ef8-f8a3-46a2-9ec5-4699ee9297f2',
        'admin', 'active', 'all')
ON CONFLICT (user_id, organization_id) DO UPDATE
SET role = 'admin', member_status = 'active', obra_scope = 'all';

WITH m AS (
  SELECT id FROM public.organization_members
  WHERE user_id = '4712840b-a88c-45c3-8f1a-4bff589080ed'
    AND organization_id = '305a7ef8-f8a3-46a2-9ec5-4699ee9297f2'
)
INSERT INTO public.member_module_permissions
  (member_id, module_code, can_view, can_create, can_update, can_delete)
SELECT m.id, mod, true, true, true, true
FROM m, unnest(ARRAY['orcamentos','obras','cronograma','rdo','medicoes','progresso',
                     'documentos','clientes','fornecedores','dashboards','equipa',
                     'configuracoes','axia']) AS mod
ON CONFLICT (member_id, module_code) DO UPDATE
SET can_view = true, can_create = true, can_update = true, can_delete = true;

DELETE FROM public.organizations
WHERE id = '50e98cf1-df09-4f97-9b47-9f61edaeb25f'
  AND NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = '50e98cf1-df09-4f97-9b47-9f61edaeb25f');
