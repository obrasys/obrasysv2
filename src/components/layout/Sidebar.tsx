import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, ExternalLink, ChevronDown } from 'lucide-react';
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

  const getActiveGroups = useCallback(() => {
    const active = new Set<string>();
    NAV_GROUPS.forEach((group) => {
      if (group.items.length > 1 && group.items.some((item) => {
        if (item.href === '/dashboard') return location.pathname === '/dashboard';
        return location.pathname.startsWith(item.href);
      })) {
        active.add(group.label);
      }
    });
    return active;
  }, [location.pathname]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(getActiveGroups);

  useEffect(() => {
    const activeGroups = getActiveGroups();
    if (activeGroups.size > 0) {
      setOpenGroups((prev) => {
        const next = new Set(prev);
        activeGroups.forEach((g) => next.add(g));
        return next;
      });
    }
  }, [getActiveGroups]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
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
        <Avatar className="h-36 w-36 border-2 border-white/15 bg-white">
          <AvatarImage src={profile?.empresa_logo_url || undefined} alt={empresaNome} className="object-contain" />
          <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-4xl font-bold">
            {empresaInitial}
          </AvatarFallback>
        </Avatar>
        <p className="mt-2 text-sm font-semibold text-sidebar-foreground text-center truncate max-w-full">{empresaNome}</p>
        <p className="text-[10px] text-white/40">ObraSys - Versão {APP_VERSION}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {NAV_GROUPS.map((group) => {
          const isSingleItem = group.items.length === 1;
          const isOpen = openGroups.has(group.label);
          const groupHasActive = group.items.some((item) => isActive(item.href));

          if (isSingleItem) {
            const item = group.items[0];
            const active = isActive(item.href);
            return (
              <button
                key={group.label}
                onClick={() => navigate(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-[14px] ${
                  active
                    ? 'bg-[hsl(192,40%,18%)] text-white font-semibold shadow-lg shadow-black/10'
                    : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-[13px] ${
                  groupHasActive && !isOpen
                    ? 'text-white font-semibold'
                    : 'text-white/65 hover:bg-white/8 hover:text-white/90'
                }`}
              >
                <group.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="pl-4 space-y-0.5 pt-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <button
                        key={item.href}
                        onClick={() => navigate(item.href)}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl transition-all duration-200 text-[12px] ${
                          active
                            ? 'bg-[hsl(192,40%,18%)] text-white font-semibold shadow-md shadow-black/10'
                            : 'text-white/50 hover:bg-white/8 hover:text-white/80'
                        }`}
                      >
                        <item.icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Super Admin Section */}
        {isSuperAdmin && (
          <div>
            <p className="px-2.5 mb-1 text-[9px] font-bold text-white/30 uppercase tracking-[0.12em]">
              Administração
            </p>
            <div className="space-y-0.5">
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-[13px] ${
                      active
                        ? 'bg-white/12 text-white font-semibold border-l-2 border-white/60'
                        : 'text-white/65 hover:bg-white/8 hover:text-white/90'
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

      {/* Portal do Cliente */}
      {showPortalLink && (
        <div className="px-3 pt-2">
          <button
            onClick={() => navigate('/portal')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-[13px] ${
              isActive('/portal')
                ? 'bg-white/12 text-white font-semibold border-l-2 border-white/60'
                : 'text-white/65 hover:bg-white/8 hover:text-white/90'
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
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] text-white/40 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
