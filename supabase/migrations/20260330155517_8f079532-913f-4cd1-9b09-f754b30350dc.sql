
-- Disable only the user-defined trigger, not system triggers
ALTER TABLE profiles DISABLE TRIGGER prevent_role_self_update_trigger;

-- Fix profiles: set role to 'cliente' for portal-only users
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

-- Re-enable the trigger
ALTER TABLE profiles ENABLE TRIGGER prevent_role_self_update_trigger;
