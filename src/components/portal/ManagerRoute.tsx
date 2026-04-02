import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const ManagerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const [sessionCheckDone, setSessionCheckDone] = useState(false);
  const [hasSession, setHasSession] = useState(true);

  // Only verify session ONCE when user is null after loading completes
  useEffect(() => {
    if (!loading && !user && !sessionCheckDone) {
      let cancelled = false;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!cancelled) {
          setHasSession(!!session);
          setSessionCheckDone(true);
        }
      });
      return () => { cancelled = true; };
    }
  }, [loading, user, sessionCheckDone]);

  // Reset check only on explicit sign-out (user goes from truthy to null)
  useEffect(() => {
    if (user) {
      // User is authenticated — mark session check as not needed
      setSessionCheckDone(false);
      setHasSession(true);
    }
  }, [!!user]); // Only trigger when user presence changes (truthy/falsy), not on every render

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // User is authenticated — proceed
  if (user) {
    // Check role-based redirects
    if (profile?.role === "cliente") {
      return <Navigate to="/portal" replace />;
    }
    if (profile?.role === "supplier") {
      return <Navigate to="/fornecedor/dashboard" replace />;
    }
    return <>{children}</>;
  }

  // User is null — verify session before redirecting
  if (!sessionCheckDone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!hasSession) {
    return <Navigate to="/auth" replace />;
  }

  // Session exists but user state hasn't propagated yet — wait briefly
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
    </div>
  );

  if (profile?.role === "cliente") {
    return <Navigate to="/portal" replace />;
  }

  if (profile?.role === "supplier") {
    return <Navigate to="/fornecedor/dashboard" replace />;
  }

  return <>{children}</>;
};
