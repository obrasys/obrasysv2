import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ContentLoader } from './ContentLoader';
import { TrialBanner, TrialExpiredModal } from '@/components/subscription';

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
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar title={title} subtitle={subtitle} />
          <ContentLoader />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex w-full max-w-[100vw] overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        {/* Top bar */}
        <TopBar title={title} subtitle={subtitle} actions={actions} />

        {/* Mobile actions bar - visible only on mobile */}
        {actions && (
          <div className="md:hidden px-4 py-3 border-b border-border bg-card">
            <div className="flex flex-wrap gap-2 [&>a]:flex-1 [&>button]:flex-1">{actions}</div>
          </div>
        )}

        {/* Trial warning banner */}
        <TrialBanner />

        {/* Trial expired modal */}
        <TrialExpiredModal />

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}
