
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  v_created_by uuid;
  v_inviter_org_id uuid;
  v_role text;
  v_invitation record;
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, empresa_nome, empresa_nif, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'empresa', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'nif', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'telefone', '')), '')
  );

  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'gestor');

  IF v_role = 'cliente' THEN
    RETURN NEW;
  END IF;

  -- Check created_by metadata (from admin-user-actions edge function)
  v_created_by := (NEW.raw_user_meta_data->>'created_by')::uuid;

  IF v_created_by IS NOT NULL THEN
    SELECT organization_id INTO v_inviter_org_id
    FROM public.organization_members
    WHERE user_id = v_created_by
    LIMIT 1;

    IF v_inviter_org_id IS NOT NULL THEN
      INSERT INTO public.organization_members (organization_id, user_id, role)
      VALUES (v_inviter_org_id, NEW.id, v_role)
      ON CONFLICT (organization_id, user_id) DO NOTHING;
      RETURN NEW;
    END IF;
  END IF;

  -- Check for pending team_invitations matching this email
  SELECT ti.organization_id, ti.role_code, ti.id, ti.invited_by_user_id, ti.obra_scope
  INTO v_invitation
  FROM public.team_invitations ti
  WHERE ti.email = NEW.email
    AND ti.status = 'pending'
    AND ti.expires_at > now()
  ORDER BY ti.created_at DESC
  LIMIT 1;

  IF v_invitation IS NOT NULL THEN
    v_role := CASE v_invitation.role_code
      WHEN 'admin' THEN 'admin'
      WHEN 'manager' THEN 'gestor'
      WHEN 'technician' THEN 'fiscal'
      WHEN 'finance' THEN 'financeiro'
      WHEN 'viewer' THEN 'gestor'
      ELSE 'gestor'
    END;

    UPDATE public.profiles SET role = v_role WHERE user_id = NEW.id;

    INSERT INTO public.organization_members (organization_id, user_id, role, member_status, invited_by, obra_scope)
    VALUES (v_invitation.organization_id, NEW.id, v_role, 'active', v_invitation.invited_by_user_id, COALESCE(v_invitation.obra_scope, 'all'))
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    UPDATE public.team_invitations
    SET status = 'accepted', accepted_at = now(), accepted_by_user_id = NEW.id
    WHERE id = v_invitation.id;

    INSERT INTO public.member_module_permissions (member_id, module_code, can_view, can_create, can_update, can_delete)
    SELECT om.id, tip.module_code, tip.can_view, tip.can_create, tip.can_update, tip.can_delete
    FROM public.organization_members om
    JOIN public.team_invitation_module_permissions tip ON tip.invitation_id = v_invitation.id
    WHERE om.user_id = NEW.id AND om.organization_id = v_invitation.organization_id;

    RETURN NEW;
  END IF;

  -- Self-registered user: create a new organization
  INSERT INTO public.organizations (nome, owner_user_id)
  VALUES (
    COALESCE(
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'empresa', '')), ''),
      COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)) || ' - Empresa'
    ),
    NEW.id
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$;
