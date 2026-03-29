
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_profile_id uuid;
  new_org_id uuid;
  v_created_by uuid;
  v_inviter_org_id uuid;
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

  -- Check if this user was invited by someone (created_by metadata)
  v_created_by := (NEW.raw_user_meta_data->>'created_by')::uuid;
  
  IF v_created_by IS NOT NULL THEN
    -- Get the inviter's organization
    SELECT organization_id INTO v_inviter_org_id
    FROM public.organization_members
    WHERE user_id = v_created_by
    LIMIT 1;
    
    IF v_inviter_org_id IS NOT NULL THEN
      -- Add to inviter's org
      INSERT INTO public.organization_members (organization_id, user_id, role)
      VALUES (v_inviter_org_id, NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'gestor'))
      ON CONFLICT (organization_id, user_id) DO NOTHING;
      RETURN NEW;
    END IF;
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
$function$;
