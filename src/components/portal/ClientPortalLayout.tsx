import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Building2, User, ChevronRight } from 'lucide-react';
import logoImg from '@/assets/logo.png';

interface ClientPortalLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function ClientPortalLayout({ children, title, subtitle, breadcrumbs }: ClientPortalLayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/portal';

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Top Bar */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="ObraSys"
              className="h-7 cursor-pointer"
              onClick={() => navigate('/portal')}
            />
            <span className="hidden sm:inline text-xs font-medium text-primary bg-primary/8 px-2 py-0.5 rounded-full">
              Portal do Cliente
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-medium text-foreground">{profile?.nome || 'Cliente'}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Breadcrumbs + Page Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <button
                onClick={() => navigate('/portal')}
                className="hover:text-foreground transition-colors"
              >
                As Minhas Obras
              </button>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  {crumb.href ? (
                    <button
                      onClick={() => navigate(crumb.href!)}
                      className="hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3">
            {!isHome && (
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-3">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} ObraSys · Portal do Cliente
          </p>
          <p className="text-[11px] text-muted-foreground">
            Powered by ObraSys
          </p>
        </div>
      </footer>
    </div>
  );
}