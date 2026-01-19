import { Navigate } from "react-router-dom";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/contexts/AuthContext";

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();

  const isLoading = authLoading || superAdminLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to dashboard if not super admin
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
