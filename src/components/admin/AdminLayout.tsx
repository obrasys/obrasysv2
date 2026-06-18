import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Wallet, ClipboardList, Mail,
  BarChart3, Store, TicketCheck, ArrowRightLeft, ChevronLeft,
  Shield, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const ADMIN_NAV = [
  { icon: LayoutDashboard, label: "Painel Geral", href: "/admin" },
  { icon: Users, label: "Utilizadores", href: "/admin/utilizadores" },
  { icon: Wallet, label: "Financeiro", href: "/admin/financeiro" },
  { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
  { icon: ClipboardList, label: "Auditoria", href: "/admin/auditoria" },
  { icon: Mail, label: "Templates Email", href: "/admin/templates" },
  { icon: Store, label: "Fornecedores", href: "/admin/fornecedores" },
  { icon: TicketCheck, label: "Tickets", href: "/admin/tickets" },
  { icon: ArrowRightLeft, label: "Migração", href: "/admin/migracao" },
  { icon: Sparkles, label: "Axia — Teste", href: "/admin/axia-nvidia-test" },
  { icon: Sparkles, label: "Axia Gateway", href: "/admin/axia-gateway-test" },
];

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Admin Sidebar */}
      <aside className="hidden lg:flex w-[240px] flex-col border-r bg-card">
        <div className="p-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Admin Panel</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Super Admin</p>
          </div>
        </div>

        <Separator />

        <ScrollArea className="flex-1 py-2">
          <nav className="px-2 space-y-0.5">
            {ADMIN_NAV.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator />

        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => navigate("/dashboard")}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar ao App
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile back */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden shrink-0"
                onClick={() => navigate("/dashboard")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </div>

          {/* Mobile nav */}
          <div className="lg:hidden mt-3 -mx-1 overflow-x-auto">
            <div className="flex gap-1 px-1 pb-1">
              {ADMIN_NAV.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors shrink-0",
                      isActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-3 w-3" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
