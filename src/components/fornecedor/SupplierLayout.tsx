import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSupplierProfile } from '@/hooks/useSuppliers';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ClipboardList,
  Tag,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/fornecedor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/fornecedor/pedidos', label: 'Pedidos de Cotação', icon: ClipboardList },
  { href: '/fornecedor/precos', label: 'Base de Preços', icon: Tag },
  { href: '/fornecedor/perfil', label: 'Perfil da Empresa', icon: User },
];

interface SupplierLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function SupplierLayout({ children, title, subtitle }: SupplierLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { data: profile } = useSupplierProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => location.pathname.startsWith(href);

  const handleSignOut = async () => {
    await signOut();
    navigate('/fornecedor/auth');
  };

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div>
          <img src={logo} alt="ObraSys" className="h-6 w-auto brightness-0 invert" />
          <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">Portal Fornecedor</p>
        </div>
      </div>

      {/* Supplier info */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.trade_name || profile?.legal_name || 'Fornecedor'}
            </p>
            {profile?.is_certified && (
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-primary">Certificado</span>
              </div>
            )}
            {profile?.status === 'pending' && (
              <span className="text-[10px] text-muted-foreground">Pendente validação</span>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => { navigate(item.href); setSidebarOpen(false); }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden lg:flex flex-col h-screen sticky top-0">
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-sidebar flex flex-col z-50">
            <NavContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur flex items-center px-4 gap-4">
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div>
            {title && <h1 className="font-semibold text-foreground">{title}</h1>}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
