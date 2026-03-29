
-- Upsert the founder user as a lifetime subscriber
INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_status, subscription_end, created_at, updated_at)
VALUES (
  '235210f3-fb93-42e2-912f-baa8e7435e98',
  'bruno.ferreira@ferreiralcantara.com',
  true,
  'founder',
  'active',
  '2099-12-31T23:59:59Z',
  now(),
  now()
)
ON CONFLICT (user_id) DO UPDATE SET
  subscribed = true,
  subscription_tier = 'founder',
  subscription_status = 'active',
  subscription_end = '2099-12-31T23:59:59Z',
  updated_at = now();
