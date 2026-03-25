import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useObraAlerts } from '@/hooks/useObraAlerts';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import {
  Clock,
  LogOut,
  User,
  Menu,
  Bell,
  Settings,
  CreditCard,
  HelpCircle,
} from 'lucide-react';
import logo from '@/assets/logo.png';
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
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
              {/* Logo */}
              <div className="p-6 border-b border-sidebar-border">
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
              {/* Use inline nav for mobile sheet */}
              <MobileNav onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <div className="lg:hidden shrink-0">
          <img src={logo} alt="ObraSys" className="h-7 md:h-8 w-auto" />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base md:text-xl font-bold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground truncate hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {/* Actions - hidden on mobile, shown in topbar on desktop */}
        {actions && <div className="hidden md:flex items-center gap-2">{actions}</div>}

        {/* Trial badge - hidden on mobile */}
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
          <PopoverContent className="w-96 p-0" align="end">
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="font-semibold">Notificações</h3>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => markAllAsRead()}>
                  Marcar tudo como lido
                </Button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {/* Quote response notifications */}
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
              {/* Obra alerts */}
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
  );
}

// Mobile navigation component (inline)
function MobileNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useSuperAdmin();

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  const go = (href: string) => {
    navigate(href);
    onNavigate?.();
  };

  return (
    <>
      <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto">
        {MAIN_NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => go(item.href)}
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
                  onClick={() => go(item.href)}
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
      <div className="p-4 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => go('/subscricao')}
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
          onClick={() => go('/definicoes')}
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
          onClick={() => go('/suporte')}
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
    </>
  );
}
