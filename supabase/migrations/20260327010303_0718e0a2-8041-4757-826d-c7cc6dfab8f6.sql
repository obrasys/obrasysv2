
-- Add new orcamento statuses (visto, negociacao, cancelado)
-- Existing: rascunho, enviado, aprovado, rejeitado, adjudicado

-- 1. Budget Awards
CREATE TABLE public.budget_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  budget_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  awarded_by_user_id UUID NOT NULL,
  awarded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  awarded_total_amount NUMERIC NOT NULL,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  deposit_percent NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org budget_awards" ON public.budget_awards
  FOR SELECT TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can insert own budget_awards" ON public.budget_awards
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own org budget_awards" ON public.budget_awards
  FOR UPDATE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

-- 2. Budget Payment Plans
CREATE TABLE public.budget_payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  budget_award_id UUID NOT NULL REFERENCES public.budget_awards(id) ON DELETE CASCADE,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  installment_no INTEGER NOT NULL,
  label TEXT NOT NULL,
  due_date DATE NOT NULL,
  percent_of_award NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org payment_plans" ON public.budget_payment_plans
  FOR SELECT TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can insert own payment_plans" ON public.budget_payment_plans
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own org payment_plans" ON public.budget_payment_plans
  FOR UPDATE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

-- 3. Receivables
CREATE TABLE public.receivables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'budget_award',
  source_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org receivables" ON public.receivables
  FOR SELECT TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can insert own receivables" ON public.receivables
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own org receivables" ON public.receivables
  FOR UPDATE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

-- 4. Receivable Payments
CREATE TABLE public.receivable_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  receivable_id UUID NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org receivable_payments" ON public.receivable_payments
  FOR SELECT TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can insert own receivable_payments" ON public.receivable_payments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. Receivable Alerts
CREATE TABLE public.receivable_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  receivable_id UUID NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'due_soon',
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  channel TEXT NOT NULL DEFAULT 'in_app',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.receivable_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org receivable_alerts" ON public.receivable_alerts
  FOR SELECT TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

CREATE POLICY "Users can insert own receivable_alerts" ON public.receivable_alerts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own org receivable_alerts" ON public.receivable_alerts
  FOR UPDATE TO authenticated
  USING (user_id = ANY(public.get_org_member_ids()));

-- Triggers for updated_at
CREATE TRIGGER update_budget_awards_updated_at BEFORE UPDATE ON public.budget_awards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_payment_plans_updated_at BEFORE UPDATE ON public.budget_payment_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receivables_updated_at BEFORE UPDATE ON public.receivables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
