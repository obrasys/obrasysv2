import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useObraAlerts } from '@/hooks/useObraAlerts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, LogOut, User, Menu, Bell } from 'lucide-react';
import logo from '@/assets/logo.png';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ObraAlertsPanel } from '@/components/alerts/ObraAlertsPanel';
import { Sidebar } from './Sidebar';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const navigate = useNavigate();
  const { profile, signOut, trialDaysRemaining } = useAuth();
  const { totalAlerts, errorCount, hasAlerts } = useObraAlerts();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <div className="h-full bg-sidebar">
              {/* Logo */}
              <div className="p-6 border-b border-sidebar-border">
                <a href="/" className="flex items-center">
                  <img
                    src={logo}
                    alt="ObraSys"
                    className="h-10 w-auto brightness-0 invert"
                  />
                </a>
              </div>
              {/* Use inline nav for mobile sheet */}
              <MobileNav />
            </div>
          </SheetContent>
        </Sheet>

        <div className="lg:hidden">
          <img src={logo} alt="ObraSys" className="h-8 w-auto" />
        </div>

        <div>
          <h1 className="font-display text-xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Actions */}
        {actions && <div className="hidden sm:flex items-center gap-2">{actions}</div>}

        {/* Trial badge */}
        {trialDaysRemaining > 0 && trialDaysRemaining <= 7 && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
            <Clock className="w-4 h-4" />
            <span>{trialDaysRemaining} dias de trial restantes</span>
          </div>
        )}

        {/* Notifications bell */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {hasAlerts && (
                <span className={`absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  errorCount > 0 ? 'bg-red-500' : 'bg-yellow-500'
                }`}>
                  {totalAlerts > 9 ? '9+' : totalAlerts}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <div className="p-3 border-b">
              <h3 className="font-semibold">Alertas de Acompanhamento</h3>
            </div>
            <div className="p-3 max-h-96 overflow-y-auto">
              <ObraAlertsPanel maxAlerts={5} showHeader={false} compact />
            </div>
          </PopoverContent>
        </Popover>

        {/* User menu */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-foreground">{profile?.nome}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
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
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

// Mobile navigation component (inline)
function MobileNav() {
  const { useLocation, useNavigate } = require('react-router-dom');
  const location = useLocation();
  const navigate = useNavigate();
  const {
    Home,
    Building2,
    FileText,
    ClipboardList,
    Calendar,
    Wallet,
    Users,
    BarChart3,
    Settings,
    HelpCircle,
  } = require('lucide-react');

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Building2, label: 'Obras', href: '/obras' },
    { icon: FileText, label: 'Orçamentos', href: '/orcamentos' },
    { icon: ClipboardList, label: 'RDOs', href: '/rdos' },
    { icon: Calendar, label: 'Tarefas', href: '/tarefas' },
    { icon: Wallet, label: 'Financeiro', href: '/financeiro' },
    { icon: Users, label: 'Clientes', href: '/clientes' },
    { icon: BarChart3, label: 'Relatórios', href: '/relatorios' },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(href);
  };

  return (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item: any) => {
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
      </nav>
      <div className="p-4 border-t border-sidebar-border space-y-1">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Definições</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors">
          <HelpCircle className="w-5 h-5" />
          <span className="font-medium">Suporte</span>
        </button>
      </div>
    </>
  );
}
