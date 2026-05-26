import { supabase } from "@/integrations/supabase/client";

/**
 * Check if the current user is a super admin by querying the super_admins table.
 * This is the authoritative check, enforced server-side via RLS and is_super_admin().
 * Falls back to false on any error.
 */
export const checkIsSuperAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
};
