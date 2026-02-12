import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ClientRouteProps {
  children: ReactNode;
}

export function ClientRoute({ children }: ClientRouteProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth', { replace: true });
      } else if (profile && profile.role !== 'cliente') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user || (profile && profile.role !== 'cliente')) {
    return null;
  }

  return <>{children}</>;
}
