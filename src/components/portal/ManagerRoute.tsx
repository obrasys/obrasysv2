import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { ContentLoader } from "@/components/layout/ContentLoader";

export const ManagerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();

  // Still loading auth state — show app shell with content skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-14 border-b border-border bg-card" />
          <ContentLoader />
        </div>
      </div>
    );
  }

  // Auth fully loaded, no user — redirect to login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // User exists but profile not yet loaded — show shell with skeleton
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-14 border-b border-border bg-card" />
          <ContentLoader />
        </div>
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
