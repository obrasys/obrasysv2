

## Problem Analysis

When you invited `pattyc.beja@gmail.com` to the client portal, the system found the existing user and granted `client_obra_access`, but did **not** change her profile role. Since the portal routing checks `profile.role === 'cliente'`, she cannot access the portal — she gets redirected to the dashboard instead.

The root issue is that the system assumes a user can only have ONE role, but in reality a user might need to be both a `gestor` (managing their own projects) AND a `cliente` (viewing someone else's project via the portal).

## Proposed Fix

**Approach**: Allow any authenticated user with a `client_obra_access` record to access the portal, regardless of their profile role. This way, existing users can be invited to view specific obras without losing their primary role.

### Changes

**1. Update `ClientRoute.tsx`**
- Instead of checking `profile.role === 'cliente'`, query `client_obra_access` to see if the user has any active portal access.
- Allow users with role `cliente` OR users with active `client_obra_access` records to access `/portal` routes.

**2. Update routing logic in `Auth.tsx`, `Index.tsx`, `fornecedor/Auth.tsx`**
- After login, if a user has role `cliente`, redirect to `/portal` (existing behavior).
- For other roles, keep redirecting to `/dashboard` (existing behavior).
- Add a "Portal do Cliente" link in the sidebar/navigation for non-cliente users who have active `client_obra_access` records, so they can navigate there voluntarily.

**3. Update `ManagerRoute.tsx`**
- Currently blocks `cliente` role users from admin routes. Keep this, but don't block users who happen to have `client_obra_access` records but a different role — they should still access admin routes.

**4. Update `create-client-portal-access` edge function**
- When the invited email belongs to an existing user with a non-`cliente` role, do NOT attempt to change their role.
- Ensure the `client_obra_access` record is created correctly (already works).
- Adjust the email template to inform existing users they can access the portal via the portal link.

**5. Add portal navigation for multi-role users**
- In the sidebar (`Sidebar.tsx`), add a conditional "Portal do Cliente" link that appears when the logged-in user (non-`cliente` role) has active `client_obra_access` entries.

### Immediate Data Fix
- For `pattyc.beja@gmail.com`, verify that `client_obra_access` exists for the correct obra. No role change needed — the code fix will allow her to access the portal with her existing role.

### Files to modify
- `src/components/portal/ClientRoute.tsx` — Allow access based on `client_obra_access`, not just role
- `src/pages/Auth.tsx` — Keep existing redirect logic (no change needed)
- `src/pages/Index.tsx` — Keep existing redirect logic (no change needed)  
- `src/components/layout/Sidebar.tsx` — Add portal link for users with client access
- `supabase/functions/create-client-portal-access/index.ts` — Minor: skip role assumption for existing users

