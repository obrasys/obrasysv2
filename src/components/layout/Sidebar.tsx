import { useLocation, useNavigate } from 'react-router-dom';
import {
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
  ShieldCheck,
  Database,
} from 'lucide-react';
import logo from '@/assets/logo.png';

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: Building2, label: 'Obras', href: '/obras' },
  { icon: FileText, label: 'Orçamentos', href: '/orcamentos' },
  { icon: Database, label: 'Base de Preços', href: '/base-precos' },
  { icon: ClipboardList, label: 'RDOs', href: '/rdos' },
  { icon: Calendar, label: 'Tarefas', href: '/tarefas' },
  { icon: ShieldCheck, label: 'Conformidade', href: '/conformidade' },
  { icon: Wallet, label: 'Financeiro', href: '/financeiro' },
  { icon: Users, label: 'Clientes', href: '/clientes' },
  { icon: BarChart3, label: 'Relatórios', href: '/relatorios' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden lg:flex flex-col">
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

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
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

      {/* Bottom section */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors">
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
