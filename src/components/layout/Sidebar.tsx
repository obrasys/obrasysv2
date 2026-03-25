import { useLocation, useNavigate } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { APP_VERSION } from '@/config/version';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { ADMIN_NAV_ITEMS, NAV_GROUPS } from '@/config/navigation';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useSuperAdmin();

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden lg:flex flex-col h-screen overflow-hidden">
      {/* Logo */}
      <div className="flex-shrink-0 p-6 border-b border-sidebar-border">
        <a href="/" className="flex items-center">
          <img src={logo} alt="ObraSys" className="h-10 w-auto brightness-0 invert" />
        </a>
        <p className="text-[10px] text-sidebar-foreground/50 mt-1">
          Versão {APP_VERSION}
        </p>
      </div>

      {/* Navigation — fully scrollable */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Super Admin Section */}
        {isSuperAdmin && (
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest">
              Administração
            </p>
            <div className="space-y-0.5">
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      active
                        ? 'bg-primary/20 text-primary font-semibold'
                        : 'text-sidebar-foreground/70 hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
