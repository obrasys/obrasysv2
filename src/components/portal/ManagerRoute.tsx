import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export const ManagerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();

  // Still loading auth state — show spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // Auth fully loaded, no user — redirect to login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // User exists but profile not yet loaded — wait briefly
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // Role-based redirects
  if (profile.role === "cliente") {
    return <Navigate to="/portal" replace />;
  }

  if (profile.role === "supplier") {
    return <Navigate to="/fornecedor/dashboard" replace />;
  }

  return <>{children}</>;
};
