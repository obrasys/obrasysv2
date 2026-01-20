-- Fix SECURITY DEFINER view issue by using security_invoker
DROP VIEW IF EXISTS public.user_subscription;

CREATE VIEW public.user_subscription
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  email,
  subscribed,
  subscription_tier,
  subscription_status,
  subscription_end,
  created_at,
  updated_at
  -- stripe_customer_id and stripe_subscription_id are intentionally excluded for security
FROM public.subscribers
WHERE user_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON public.user_subscription TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.user_subscription IS 'Safe view of subscription data that hides Stripe IDs from client access. Uses security_invoker to respect RLS policies.';