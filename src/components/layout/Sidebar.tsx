import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, ExternalLink, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useClientAccess } from '@/hooks/useClientAccess';
import { ADMIN_NAV_ITEMS, NAV_GROUPS } from '@/config/navigation';
import { APP_VERSION } from '@/config/version';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const { hasClientAccess } = useClientAccess();
  const showPortalLink = hasClientAccess && profile?.role !== 'cliente';

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const empresaNome = profile?.empresa_nome || profile?.empresa || 'Empresa';
  const empresaInitial = empresaNome?.charAt(0)?.toUpperCase() || 'E';

  return (
    <aside className="w-60 bg-sidebar border-r border-sidebar-border hidden lg:flex flex-col h-screen sticky top-0">
      {/* Company Logo */}
      <div className="px-5 pt-5 pb-4 flex flex-col items-center">
        <Avatar className="h-36 w-36 border-2 border-sidebar-foreground/20">
          <AvatarImage src={profile?.empresa_logo_url || undefined} alt={empresaNome} className="object-contain" />
          <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-4xl font-bold">
            {empresaInitial}
          </AvatarFallback>
        </Avatar>
        <p className="mt-2 text-sm font-semibold text-sidebar-foreground text-center truncate max-w-full">{empresaNome}</p>
        <p className="text-[10px] text-sidebar-foreground/50">Versão {APP_VERSION}</p>
      </div>

      {/* Navigation — with scroll */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1 text-[9px] font-bold text-sidebar-foreground/50 uppercase tracking-[0.12em]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors text-[13px] ${
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
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
            <p className="px-2 mb-1 text-[9px] font-bold text-sidebar-foreground/50 uppercase tracking-[0.12em]">
              Administração
            </p>
            <div className="space-y-0.5">
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors text-[13px] ${
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
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

      {/* Portal do Cliente link for multi-role users */}
      {showPortalLink && (
        <div className="px-3 pt-2">
          <button
            onClick={() => navigate('/portal')}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors text-[13px] ${
              isActive('/portal')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            }`}
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span>Portal do Cliente</span>
          </button>
        </div>
      )}

      {/* Sign out */}
      <div className="px-3 pb-4 pt-2">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-2 py-2 text-[13px] text-sidebar-foreground/60 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
