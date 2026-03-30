
-- Remove portal-only cliente users from organizations they shouldn't belong to
-- (they were added by the handle_new_user trigger via created_by metadata)
-- Keep only users who are pure clients (no obras, no orcamentos, role=cliente)
DELETE FROM organization_members
WHERE user_id IN (
  SELECT p.user_id
  FROM profiles p
  WHERE p.role = 'cliente'
    AND p.user_id NOT IN (SELECT DISTINCT user_id FROM obras)
    AND p.user_id NOT IN (SELECT DISTINCT user_id FROM orcamentos)
    AND p.user_id NOT IN (SELECT user_id FROM super_admins)
    AND p.user_id IN (SELECT DISTINCT client_user_id FROM client_obra_access)
);
