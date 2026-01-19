// List of super admin emails with full system access
export const SUPER_ADMIN_EMAILS = [
  "obrasys.pt@gmail.com",
  "riquebeze@gmail.com",
  "contacto@obrasys.pt"
] as const;

export type SuperAdminEmail = typeof SUPER_ADMIN_EMAILS[number];

export const isSuperAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase() as SuperAdminEmail);
};
