import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <TopBar title={title} subtitle={subtitle} actions={actions} />

        {/* Trial warning banner */}
        {profile?.trial_expired && (
          <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">
                O seu período de trial expirou. Atualize para continuar a usar o ObraSys.
              </span>
            </div>
            <Button variant="accent" size="sm">
              Ver planos
            </Button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
