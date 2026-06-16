
CREATE OR REPLACE FUNCTION public.lookup_supplier_invite(_token uuid)
RETURNS TABLE (
  id uuid,
  email text,
  nome_fornecedor text,
  categoria text,
  mensagem text,
  status text,
  expires_at timestamptz,
  organization_id uuid,
  organization_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT si.id, si.email, si.nome_fornecedor, si.categoria, si.mensagem,
         si.status, si.expires_at, si.organization_id, o.nome
  FROM public.supplier_invites si
  LEFT JOIN public.organizations o ON o.id = si.organization_id
  WHERE si.token = _token
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.lookup_supplier_invite(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_supplier_invite(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite public.supplier_invites%ROWTYPE;
  v_profile_id uuid;
  v_link_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO v_invite FROM public.supplier_invites WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Convite não encontrado'; END IF;
  IF v_invite.status <> 'pending' THEN RAISE EXCEPTION 'Convite já foi processado (estado: %)', v_invite.status; END IF;
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    UPDATE public.supplier_invites SET status='expired' WHERE id = v_invite.id;
    RAISE EXCEPTION 'Convite expirado';
  END IF;
  IF v_invite.organization_id IS NULL THEN RAISE EXCEPTION 'Convite sem empresa associada'; END IF;

  SELECT id INTO v_profile_id FROM public.supplier_profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_profile_id IS NULL THEN RAISE EXCEPTION 'Complete o seu perfil de fornecedor antes de aceitar'; END IF;

  INSERT INTO public.tenant_supplier_links (organization_id, supplier_profile_id, invite_id, status)
  VALUES (v_invite.organization_id, v_profile_id, v_invite.id, 'active')
  ON CONFLICT (organization_id, supplier_profile_id) DO UPDATE SET status='active', updated_at = now()
  RETURNING id INTO v_link_id;

  UPDATE public.supplier_invites SET status='accepted', accepted_at = now() WHERE id = v_invite.id;

  RETURN jsonb_build_object('link_id', v_link_id, 'organization_id', v_invite.organization_id, 'invite_id', v_invite.id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_supplier_invite(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_supplier_invite(_invite_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.supplier_invites WHERE id = _invite_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Convite não encontrado'; END IF;
  IF NOT public.is_org_member(v_org) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.supplier_invites SET status='cancelled', cancelled_at = now()
  WHERE id = _invite_id AND status = 'pending';
END;
$$;
GRANT EXECUTE ON FUNCTION public.cancel_supplier_invite(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.expire_old_supplier_invites()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  WITH upd AS (
    UPDATE public.supplier_invites SET status='expired'
    WHERE status='pending' AND expires_at IS NOT NULL AND expires_at < now()
    RETURNING 1
  ) SELECT COUNT(*)::int FROM upd
$$;
GRANT EXECUTE ON FUNCTION public.expire_old_supplier_invites() TO authenticated, service_role;
