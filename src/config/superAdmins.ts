import { supabase } from "@/integrations/supabase/client";

/**
 * Check if the current user is a super admin by querying the super_admins table.
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

// Keep synchronous helper for backward compatibility with client-side checks
// This is used as a quick check; the authoritative check is via RLS/database
export const isSuperAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  // Hardcoded list kept as a fast client-side hint only.
  // The actual authorization is enforced server-side via the super_admins table and is_super_admin() function.
  const SUPER_ADMIN_EMAILS = [
    "obrasys.pt@gmail.com",
    "riquebeze@gmail.com",
    "contacto@obrasys.pt"
  ];
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
};
