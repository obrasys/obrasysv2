import { useAuth } from "@/contexts/AuthContext";
import { isSuperAdmin } from "@/config/superAdmins";

export const useSuperAdmin = () => {
  const { user, loading } = useAuth();
  
  return {
    isSuperAdmin: isSuperAdmin(user?.email),
    loading
  };
};
