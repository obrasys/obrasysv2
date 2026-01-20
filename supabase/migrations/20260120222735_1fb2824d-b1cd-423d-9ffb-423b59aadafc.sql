-- Fix security: Remove user ability to update sensitive Stripe fields
-- Users should not be able to modify their own subscription data directly

-- Drop the problematic update policy
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscribers;

-- Create a restricted update policy that only allows updating non-sensitive fields
-- In practice, users should not update subscribers directly - only via Stripe webhooks
-- For now, we'll remove user update access entirely

-- Create a view that hides sensitive Stripe IDs from users
CREATE OR REPLACE VIEW public.user_subscription AS
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
  -- stripe_customer_id and stripe_subscription_id are intentionally excluded
FROM public.subscribers
WHERE user_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON public.user_subscription TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.user_subscription IS 'Safe view of subscription data that hides Stripe IDs from client access';

-- Ensure profiles policies are correct (they already are, but let's verify by recreating if needed)
-- The existing policies are correct:
-- - Users can only view/update their own profile
-- - Super admins can view all profiles (for admin purposes)