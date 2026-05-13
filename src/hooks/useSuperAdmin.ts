import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { checkIsSuperAdmin } from "@/config/superAdmins";

export const useSuperAdmin = () => {
  const { user, loading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setIsSuperAdmin(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    checkIsSuperAdmin(user.id)
      .then((result) => {
        if (!cancelled) setIsSuperAdmin(result);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return {
    isSuperAdmin,
    loading: loading || checking,
  };
};
