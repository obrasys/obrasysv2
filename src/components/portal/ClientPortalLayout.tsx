import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import logoImg from '@/assets/logo.png';

interface ClientPortalLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function ClientPortalLayout({ children, title, subtitle }: ClientPortalLayoutProps) {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="ObraSys" className="h-8" />
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">{profile?.nome || 'Cliente'}</p>
            <p className="text-xs text-muted-foreground">Portal do Cliente</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </header>

      {/* Page header */}
      <div className="border-b border-border bg-card px-4 sm:px-6 py-4">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
