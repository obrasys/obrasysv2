
-- Fix profiles: set role to 'cliente' for users who were created for portal access only
-- We identify them by having client_obra_access records and not being admin/super_admin
-- Exclude riquebeze@gmail.com (admin) and users who own obras/orcamentos (real managers)
UPDATE profiles 
SET role = 'cliente'
WHERE user_id IN (
  SELECT DISTINCT coa.client_user_id 
  FROM client_obra_access coa
  JOIN profiles p ON p.user_id = coa.client_user_id
  WHERE p.role NOT IN ('admin', 'cliente', 'supplier')
    AND p.user_id NOT IN (SELECT DISTINCT user_id FROM obras)
    AND p.user_id NOT IN (SELECT DISTINCT user_id FROM orcamentos)
    AND p.user_id NOT IN (SELECT user_id FROM super_admins)
);

-- Remove these portal-only users from organizations they were incorrectly added to
DELETE FROM organization_members
WHERE user_id IN (
  SELECT DISTINCT coa.client_user_id 
  FROM client_obra_access coa
  JOIN profiles p ON p.user_id = coa.client_user_id
  WHERE p.role = 'cliente'
    AND p.user_id NOT IN (SELECT DISTINCT user_id FROM obras)
    AND p.user_id NOT IN (SELECT DISTINCT user_id FROM orcamentos)
    AND p.user_id NOT IN (SELECT user_id FROM super_admins)
)
AND role != 'admin';
