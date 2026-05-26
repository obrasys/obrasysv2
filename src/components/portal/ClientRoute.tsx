import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientRouteProps {
  children: ReactNode;
}

function PortalLoader() {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <div className="h-14 bg-card border-b border-border" />
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ClientRoute({ children }: ClientRouteProps) {
  const { user, profile, loading, mfaVerified } = useAuth();
  const navigate = useNavigate();
  const [hasPortalAccess, setHasPortalAccess] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAccess() {
      if (!user?.id) {
        setHasPortalAccess(false);
        return;
      }

      if (profile?.role === 'cliente') {
        setHasPortalAccess(true);
        return;
      }

      const { data, error } = await supabase
        .from('client_obra_access')
        .select('id')
        .eq('client_user_id', user.id)
        .eq('ativo', true)
        .limit(1);

      if (error) {
        console.error('Error checking portal access:', error);
        setHasPortalAccess(false);
        return;
      }

      setHasPortalAccess(data && data.length > 0);
    }

    if (!loading && user) {
      checkAccess();
    } else if (!loading && !user) {
      setHasPortalAccess(false);
    }
  }, [user, profile, loading]);

  useEffect(() => {
    if (!loading && hasPortalAccess !== null) {
      if (!user) {
        navigate('/auth', { replace: true });
      } else if (!hasPortalAccess) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, hasPortalAccess, loading, navigate]);

  if (loading || hasPortalAccess === null) {
    return <PortalLoader />;
  }

  if (!user || !hasPortalAccess) {
    return null;
  }

  if (!mfaVerified) {
    return <Navigate to="/verify-2fa" replace />;
  }

  return <>{children}</>;
}
