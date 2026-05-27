DO $$
DECLARE v_member_id uuid;
BEGIN
  ALTER TABLE public.profiles DISABLE TRIGGER prevent_profile_role_self_update_trigger;
  ALTER TABLE public.profiles DISABLE TRIGGER prevent_role_self_update_trigger;

  UPDATE public.profiles SET role = 'admin' WHERE email = 'joaopatricioccpereira@pm.me';

  ALTER TABLE public.profiles ENABLE TRIGGER prevent_profile_role_self_update_trigger;
  ALTER TABLE public.profiles ENABLE TRIGGER prevent_role_self_update_trigger;

  SELECT id INTO v_member_id FROM public.organization_members
  WHERE user_id = '4712840b-a88c-45c3-8f1a-4bff589080ed' LIMIT 1;

  UPDATE public.organization_members
  SET role = 'admin', member_status = 'active', obra_scope = 'all'
  WHERE id = v_member_id;

  INSERT INTO public.member_module_permissions (member_id, module_code, can_view, can_create, can_update, can_delete)
  SELECT v_member_id, code, true, true, true, true
  FROM unnest(ARRAY['orcamentos','obras','cronograma','rdo','medicoes','progresso','documentos','clientes','fornecedores','dashboards','equipa','configuracoes','axia']) AS code
  ON CONFLICT (member_id, module_code) DO UPDATE
    SET can_view = true, can_create = true, can_update = true, can_delete = true;

  DELETE FROM public.super_admins WHERE user_id = '4712840b-a88c-45c3-8f1a-4bff589080ed';
END $$;