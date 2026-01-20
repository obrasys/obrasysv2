-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL,
  price_yearly NUMERIC,
  features JSONB DEFAULT '[]'::jsonb,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create subscribers table
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  subscribed BOOLEAN DEFAULT false,
  subscription_tier TEXT DEFAULT 'trial',
  subscription_status TEXT DEFAULT 'trialing',
  subscription_end TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(stripe_customer_id)
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- RLS for subscription_plans (public read)
CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

-- RLS for subscribers (users can only see their own)
CREATE POLICY "Users can view their own subscription"
  ON public.subscribers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON public.subscribers FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role can manage all subscribers"
  ON public.subscribers FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Insert default plans
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, features, sort_order) VALUES
(
  'Starter',
  'Para profissionais independentes',
  49,
  470,
  '["Até 5 obras ativas", "1 utilizador", "Orçamentos ilimitados", "Suporte por email"]'::jsonb,
  1
),
(
  'Professional',
  'Para equipas pequenas',
  99,
  950,
  '["Obras ilimitadas", "Até 5 utilizadores", "RDOs ilimitados", "Relatórios avançados", "Suporte prioritário"]'::jsonb,
  2
),
(
  'Enterprise',
  'Para grandes empresas',
  0,
  0,
  '["Tudo do Professional", "Utilizadores ilimitados", "API access", "SSO/SAML", "Gestor de conta dedicado", "SLA garantido"]'::jsonb,
  3
);

-- Trigger to update updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to create subscriber record on user creation
CREATE OR REPLACE FUNCTION public.handle_new_subscriber()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscribers (user_id, email, subscription_tier, subscription_status, subscription_end)
  VALUES (
    NEW.id,
    NEW.email,
    'trial',
    'trialing',
    now() + interval '30 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create subscriber on new user
CREATE TRIGGER on_auth_user_created_subscriber
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_subscriber();