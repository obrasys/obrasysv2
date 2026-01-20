-- Create function to auto-create subscriber for new users
CREATE OR REPLACE FUNCTION public.create_subscriber_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscribers (user_id, email, subscription_tier, subscription_status, subscription_end, subscribed)
  VALUES (
    NEW.user_id,
    NEW.email,
    'trial',
    'trialing',
    NEW.trial_end,
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_created_create_subscriber ON public.profiles;
CREATE TRIGGER on_profile_created_create_subscriber
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_subscriber_for_new_user();

-- Migrate existing users without subscriber records
INSERT INTO public.subscribers (user_id, email, subscription_tier, subscription_status, subscription_end, subscribed)
SELECT 
  p.user_id,
  p.email,
  'trial',
  CASE WHEN p.trial_expired THEN 'canceled' ELSE 'trialing' END,
  p.trial_end,
  false
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscribers s WHERE s.user_id = p.user_id
)
AND p.trial_end IS NOT NULL;