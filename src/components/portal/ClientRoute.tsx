import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ClientRouteProps {
  children: ReactNode;
}

export function ClientRoute({ children }: ClientRouteProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [hasPortalAccess, setHasPortalAccess] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAccess() {
      if (!user?.id) {
        setHasPortalAccess(false);
        return;
      }

      // Users with role 'cliente' always have portal access
      if (profile?.role === 'cliente') {
        setHasPortalAccess(true);
        return;
      }

      // For other roles, check if they have active client_obra_access records
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user || !hasPortalAccess) {
    return null;
  }

  return <>{children}</>;
}
