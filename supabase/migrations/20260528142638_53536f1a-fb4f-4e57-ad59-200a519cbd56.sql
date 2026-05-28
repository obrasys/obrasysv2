
-- Helper function: admin/owner of caller's org, or row owner
CREATE OR REPLACE FUNCTION public.is_org_admin_or_self(_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _target = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om1
      JOIN public.organization_members om2
        ON om2.organization_id = om1.organization_id
      WHERE om1.user_id = auth.uid()
        AND om1.role IN ('admin','owner')
        AND om2.user_id = _target
    )
    OR public.is_super_admin();
$$;

GRANT EXECUTE ON FUNCTION public.is_org_admin_or_self(uuid) TO authenticated;

-- clientes_view: mask NIF
CREATE OR REPLACE VIEW public.clientes_view
WITH (security_invoker = on) AS
SELECT
  c.id, c.user_id, c.nome, c.email, c.telefone, c.telemovel,
  c.empresa, c.endereco, c.codigo_postal, c.cidade, c.pais,
  c.nivel_acesso, c.ativo, c.observacoes, c.criado_por,
  c.created_at, c.updated_at,
  CASE WHEN public.is_org_admin_or_self(c.user_id) THEN c.nif ELSE NULL END AS nif
FROM public.clientes c;

GRANT SELECT ON public.clientes_view TO authenticated;

-- equipa_membros_view: mask NIF + salario_base
CREATE OR REPLACE VIEW public.equipa_membros_view
WITH (security_invoker = on) AS
SELECT
  e.id, e.user_id, e.nome, e.cargo, e.email, e.telefone,
  e.data_admissao, e.tipo_contrato, e.subempreiteiro_id,
  e.ativo, e.observacoes, e.obra_atual_id, e.foto_url,
  e.created_at, e.updated_at,
  CASE WHEN public.is_org_admin_or_self(e.user_id) THEN e.nif         ELSE NULL END AS nif,
  CASE WHEN public.is_org_admin_or_self(e.user_id) THEN e.salario_base ELSE NULL END AS salario_base
FROM public.equipa_membros e;

GRANT SELECT ON public.equipa_membros_view TO authenticated;

-- profiles_view: mask NIF + empresa_nif
CREATE OR REPLACE VIEW public.profiles_view
WITH (security_invoker = on) AS
SELECT
  p.id, p.user_id, p.nome, p.email, p.telefone, p.empresa,
  p.avatar_url, p.role, p.trial_start, p.trial_end, p.trial_expired,
  p.empresa_nome, p.empresa_morada, p.empresa_cidade,
  p.empresa_codigo_postal, p.empresa_pais, p.empresa_telefone,
  p.empresa_email, p.empresa_logo_url, p.default_budget_observations,
  p.created_at, p.updated_at,
  CASE WHEN public.is_org_admin_or_self(p.user_id) THEN p.nif         ELSE NULL END AS nif,
  CASE WHEN public.is_org_admin_or_self(p.user_id) THEN p.empresa_nif ELSE NULL END AS empresa_nif
FROM public.profiles p;

GRANT SELECT ON public.profiles_view TO authenticated;

-- workers_view: mask NIF + all salary/rate columns
CREATE OR REPLACE VIEW public.workers_view
WITH (security_invoker = on) AS
SELECT
  w.id, w.user_id, w.employee_code, w.full_name, w.role,
  w.employment_type, w.active, w.start_date, w.end_date,
  w.subempreiteiro_id, w.equipa_membro_id, w.compensation_type,
  w.phone, w.email, w.created_at, w.updated_at,
  CASE WHEN public.is_org_admin_or_self(w.user_id) THEN w.nif                  ELSE NULL END AS nif,
  CASE WHEN public.is_org_admin_or_self(w.user_id) THEN w.default_hourly_cost  ELSE NULL END AS default_hourly_cost,
  CASE WHEN public.is_org_admin_or_self(w.user_id) THEN w.default_daily_cost   ELSE NULL END AS default_daily_cost,
  CASE WHEN public.is_org_admin_or_self(w.user_id) THEN w.overtime_hourly_cost ELSE NULL END AS overtime_hourly_cost,
  CASE WHEN public.is_org_admin_or_self(w.user_id) THEN w.monthly_salary       ELSE NULL END AS monthly_salary,
  CASE WHEN public.is_org_admin_or_self(w.user_id) THEN w.hourly_rate          ELSE NULL END AS hourly_rate,
  CASE WHEN public.is_org_admin_or_self(w.user_id) THEN w.unit_rate_m2         ELSE NULL END AS unit_rate_m2,
  CASE WHEN public.is_org_admin_or_self(w.user_id) THEN w.unit_rate_ml         ELSE NULL END AS unit_rate_ml
FROM public.workers w;

GRANT SELECT ON public.workers_view TO authenticated;
