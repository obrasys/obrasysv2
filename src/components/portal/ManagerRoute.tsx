import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const ManagerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const [sessionVerified, setSessionVerified] = useState(false);
  const [hasSession, setHasSession] = useState(true);

  // Double-check session before redirecting away — prevents race condition loops
  useEffect(() => {
    if (!loading && !user && !sessionVerified) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setHasSession(!!session);
        setSessionVerified(true);
      });
    } else if (user) {
      // User is present, reset verification state
      setSessionVerified(false);
      setHasSession(true);
    }
  }, [loading, user, sessionVerified]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // If user is null, verify session before redirecting
  if (!user) {
    if (!sessionVerified) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      );
    }
    if (!hasSession) {
      return <Navigate to="/auth" replace />;
    }
    // Session exists but user state hasn't caught up yet — wait
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (profile?.role === "cliente") {
    return <Navigate to="/portal" replace />;
  }

  if (profile?.role === "supplier") {
    return <Navigate to="/fornecedor/dashboard" replace />;
  }

  return <>{children}</>;
};
