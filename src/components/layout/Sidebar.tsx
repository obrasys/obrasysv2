import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, HelpCircle, Settings } from 'lucide-react';
import logo from '@/assets/logo.png';
import { APP_VERSION } from '@/config/version';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { ADMIN_NAV_ITEMS, MAIN_NAV_ITEMS } from '@/config/navigation';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useSuperAdmin();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    if (href === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden lg:flex flex-col h-screen">
      {/* Logo */}
      <div className="flex-shrink-0 p-6 border-b border-sidebar-border">
        <a href="/" className="flex items-center">
          <img
            src={logo}
            alt="ObraSys"
            className="h-10 w-auto brightness-0 invert"
          />
        </a>
        <p className="text-[10px] text-sidebar-foreground/50 mt-1">
          Versão {APP_VERSION}
        </p>
      </div>

      {/* Navigation - scrollable area */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {MAIN_NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* Super Admin Section */}
        {isSuperAdmin && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-4 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Administração
              </p>
            </div>
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? 'bg-primary/20 text-primary'
                      : 'text-sidebar-foreground/70 hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="flex-shrink-0 p-4 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => navigate('/subscricao')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            location.pathname.startsWith('/subscricao')
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="font-medium">Subscrição</span>
        </button>
        <button 
          onClick={() => navigate('/definicoes')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            location.pathname.startsWith('/definicoes')
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Definições</span>
        </button>
        <button
          onClick={() => navigate('/suporte')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            location.pathname.startsWith('/suporte')
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          }`}
        >
          <HelpCircle className="w-5 h-5" />
          <span className="font-medium">Suporte</span>
        </button>
      </div>
    </aside>
  );
}
