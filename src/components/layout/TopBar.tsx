import { ReactNode, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useObraAlerts } from '@/hooks/useObraAlerts';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Clock,
  LogOut,
  User,
  Menu,
  Bell,
  Settings,
  CreditCard,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ObraAlertsPanel } from '@/components/alerts/ObraAlertsPanel';
import { ADMIN_NAV_ITEMS, NAV_GROUPS } from '@/config/navigation';
import { APP_VERSION } from '@/config/version';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { ChangelogDialog } from '@/components/layout/ChangelogDialog';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const navigate = useNavigate();
  const { profile, signOut, trialDaysRemaining } = useAuth();
  const { totalAlerts, errorCount, hasAlerts } = useObraAlerts();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <>
    <header className="h-14 md:h-16 border-b border-border bg-card px-3 md:px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        {/* Mobile menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>Navegação principal</SheetDescription>
            </SheetHeader>
            <div className="h-full bg-sidebar flex flex-col min-h-0">
              {/* Company logo */}
              <div className="p-6 border-b border-sidebar-border flex flex-col items-center">
                <Avatar className="h-16 w-16 border-2 border-sidebar-foreground/20 bg-white">
                  <AvatarImage src={profile?.empresa_logo_url || undefined} alt={profile?.empresa_nome || 'Empresa'} className="object-contain" />
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xl font-bold">
                    {(profile?.empresa_nome || profile?.empresa || 'E').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-2 text-sm font-semibold text-sidebar-foreground text-center truncate max-w-full">
                  {profile?.empresa_nome || profile?.empresa || 'Empresa'}
                </p>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); setChangelogOpen(true); }}
                  className="text-[10px] text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors underline-offset-2 hover:underline"
                >
                  ObraSys - Versão {APP_VERSION}
                </button>
              </div>
              {/* Use inline nav for mobile sheet */}
              <MobileNav onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <div className="lg:hidden shrink-0">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage src={profile?.empresa_logo_url || undefined} alt={profile?.empresa_nome || 'Empresa'} className="object-contain" />
            <AvatarFallback className="bg-accent/10 text-accent text-xs font-bold">
              {(profile?.empresa_nome || profile?.empresa || 'E').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base md:text-xl font-bold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground truncate hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {actions && <div className="hidden md:flex items-center gap-2">{actions}</div>}

        {trialDaysRemaining > 0 && trialDaysRemaining <= 7 && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
            <Clock className="w-4 h-4" />
            <span>{trialDaysRemaining} dias de trial restantes</span>
          </div>
        )}

        {/* Notifications bell */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {(hasAlerts || unreadCount > 0) && (
                <span className={`absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  errorCount > 0 ? 'bg-destructive' : unreadCount > 0 ? 'bg-primary' : 'bg-yellow-500'
                }`}>
                  {(totalAlerts + unreadCount) > 9 ? '9+' : totalAlerts + unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 max-w-96 p-0" align="end">
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="font-semibold">Notificações</h3>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => markAllAsRead()}>
                  Marcar tudo como lido
                </Button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 && (
                <div className="divide-y">
                  {notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 flex items-start gap-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        !n.read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) navigate(n.link);
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.read ? 'bg-primary' : 'bg-transparent'}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${!n.read ? 'font-medium' : 'text-muted-foreground'}`}>{n.title}</p>
                        {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {hasAlerts && (
                <div className="p-3 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Alertas de Obra</p>
                  <ObraAlertsPanel maxAlerts={3} showHeader={false} compact />
                </div>
              )}
              {!hasAlerts && notifications.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Sem notificações
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-foreground">{profile?.nome}</p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-accent" />
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/perfil')}>
              <User className="w-4 h-4 mr-2" />
              O Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/subscricao')}>
              <CreditCard className="w-4 h-4 mr-2" />
              Subscrição
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/definicoes')}>
              <Settings className="w-4 h-4 mr-2" />
              Definições
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </>
  );
}



// Mobile navigation component with collapsible groups
function MobileNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useSuperAdmin();

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

  const go = (href: string) => {
    navigate(href);
    onNavigate?.();
  };

  return (
    <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto">
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
                onClick={() => go(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                  active
                    ? 'bg-white/12 text-white font-semibold border-l-2 border-white/60'
                    : 'text-white/65 hover:bg-white/8 hover:text-white/90'
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                groupHasActive && !isOpen
                  ? 'text-white font-semibold'
                  : 'text-white/65 hover:bg-white/8 hover:text-white/90'
              }`}
            >
              <group.icon className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="pl-5 space-y-0.5 pt-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <button
                      key={item.href}
                      onClick={() => go(item.href)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-[13px] ${
                        active
                          ? 'bg-white/12 text-white font-semibold border-l-2 border-white/60'
                          : 'text-white/50 hover:bg-white/8 hover:text-white/80'
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {isSuperAdmin && (
        <div>
          <p className="px-3 mb-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
            Administração
          </p>
          <div className="space-y-0.5">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => go(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    active
                      ? 'bg-white/12 text-white font-semibold border-l-2 border-white/60'
                      : 'text-white/65 hover:bg-white/8 hover:text-white/90'
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
  );
}
