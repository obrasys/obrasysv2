
REVOKE SELECT (stripe_customer_id, stripe_subscription_id)
  ON public.subscribers FROM authenticated;
