import { useLocation, useNavigate } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { ADMIN_NAV_ITEMS, NAV_GROUPS } from '@/config/navigation';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <aside className="w-60 bg-sidebar hidden lg:flex flex-col h-screen">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <a href="/" className="flex items-center">
          <img src={logo} alt="ObraSys" className="h-8 w-auto brightness-0 invert" />
        </a>
      </div>

      {/* Navigation — no scroll */}
      <nav className="flex-1 px-3 space-y-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-0.5 text-[9px] font-bold text-sidebar-foreground/35 uppercase tracking-[0.12em]">
              {group.label}
            </p>
            <div className="space-y-px">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors text-[13px] ${
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                        : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Super Admin Section */}
        {isSuperAdmin && (
          <div>
            <p className="px-2 mb-0.5 text-[9px] font-bold text-sidebar-foreground/35 uppercase tracking-[0.12em]">
              Administração
            </p>
            <div className="space-y-px">
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors text-[13px] ${
                      active
                        ? 'bg-primary/20 text-primary font-semibold'
                        : 'text-sidebar-foreground/65 hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4 pt-2">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
