
-- ============================================
-- MULTI-TENANT ORGANIZATIONS SYSTEM
-- ============================================

-- 1. Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  nif text,
  logo_url text,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create organization_members table  
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'gestor',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 3. Create helper function: returns all user_ids in caller's organization
CREATE OR REPLACE FUNCTION public.get_org_member_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ARRAY_AGG(om2.user_id)
     FROM organization_members om
     JOIN organization_members om2 ON om2.organization_id = om.organization_id
     WHERE om.user_id = auth.uid()),
    ARRAY[auth.uid()]
  )
$$;

-- Helper to get user's org id
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1
$$;

-- 4. RLS for organizations
CREATE POLICY "Members can view their org"
  ON public.organizations FOR SELECT TO authenticated
  USING (id = public.get_user_org_id());

CREATE POLICY "Owner can update org"
  ON public.organizations FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Super admins can view all orgs"
  ON public.organizations FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 5. RLS for organization_members
CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Org owner/admin can insert members"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Org owner can delete members"
  ON public.organization_members FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Super admins can manage all members"
  ON public.organization_members FOR ALL TO authenticated
  USING (public.is_super_admin());

-- 6. Migrate existing users: create one organization per existing user
-- Each user gets their own org, and existing data stays visible to them
DO $$
DECLARE
  p RECORD;
  new_org_id uuid;
BEGIN
  FOR p IN SELECT DISTINCT user_id, nome, empresa, empresa_nome, empresa_nif FROM public.profiles LOOP
    -- Create organization for this user
    INSERT INTO public.organizations (nome, nif, owner_user_id)
    VALUES (
      COALESCE(p.empresa_nome, p.empresa, p.nome || ' - Empresa'),
      p.empresa_nif,
      p.user_id
    )
    RETURNING id INTO new_org_id;
    
    -- Add user as member with admin role
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, p.user_id, 'admin')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;

-- 7. Update RLS policies on all core business tables
-- Drop old user_id = auth.uid() policies and create org-based ones
DO $$
DECLARE
  t TEXT;
  pol RECORD;
  tables_standard TEXT[] := ARRAY[
    'obras', 'orcamentos', 'clientes', 'tarefas', 'tarefas_cronograma',
    'equipa_membros', 'subempreiteiros', 'equipamentos', 
    'contas_financeiras', 'fornecedores', 'autos_medicao',
    'base_precos_personalizada', 'artigos_trabalho', 'cadernos_encargos',
    'categorias_financeiras', 'checklist_conformidade', 'documentos',
    'livro_obra', 'aprovacoes', 'alocacoes_obra'
  ];
BEGIN
  FOREACH t IN ARRAY tables_standard LOOP
    -- Drop old user-specific policies
    FOR pol IN 
      SELECT policyname FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = t 
      AND policyname LIKE 'Users can %'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    
    -- Create new org-based policies
    EXECUTE format(
      'CREATE POLICY "Org members can view %s" ON public.%I FOR SELECT TO authenticated USING (user_id = ANY(public.get_org_member_ids()))',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "Users can insert %s" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "Org members can update %s" ON public.%I FOR UPDATE TO authenticated USING (user_id = ANY(public.get_org_member_ids()))',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "Org members can delete %s" ON public.%I FOR DELETE TO authenticated USING (user_id = ANY(public.get_org_member_ids()))',
      t, t
    );
  END LOOP;
END;
$$;

-- 8. Handle special tables: relatorios_diarios (RLS checks via obras)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'relatorios_diarios' 
    AND policyname LIKE 'Users can %'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.relatorios_diarios', pol.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Org members can view RDOs"
  ON public.relatorios_diarios FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM obras o 
    WHERE o.id = relatorios_diarios.obra_id 
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

CREATE POLICY "Org members can create RDOs"
  ON public.relatorios_diarios FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM obras o 
      WHERE o.id = relatorios_diarios.obra_id 
      AND o.user_id = ANY(public.get_org_member_ids())
    )
  );

CREATE POLICY "Org members can update RDOs"
  ON public.relatorios_diarios FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM obras o 
    WHERE o.id = relatorios_diarios.obra_id 
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

CREATE POLICY "Org members can delete RDOs"
  ON public.relatorios_diarios FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM obras o 
    WHERE o.id = relatorios_diarios.obra_id 
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

-- 9. Handle financeiro_obras (RLS checks via obras)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'financeiro_obras' 
    AND policyname LIKE 'Users can %'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.financeiro_obras', pol.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Org members can view financeiro_obras"
  ON public.financeiro_obras FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM obras o 
    WHERE o.id = financeiro_obras.obra_id 
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

CREATE POLICY "Org members can insert financeiro_obras"
  ON public.financeiro_obras FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM obras o 
    WHERE o.id = financeiro_obras.obra_id 
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

CREATE POLICY "Org members can update financeiro_obras"
  ON public.financeiro_obras FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM obras o 
    WHERE o.id = financeiro_obras.obra_id 
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

CREATE POLICY "Org members can delete financeiro_obras"
  ON public.financeiro_obras FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM obras o 
    WHERE o.id = financeiro_obras.obra_id 
    AND o.user_id = ANY(public.get_org_member_ids())
  ));

-- 10. Update profiles RLS: allow viewing org members' profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view org member profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

-- 11. Add updated_at trigger for organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
