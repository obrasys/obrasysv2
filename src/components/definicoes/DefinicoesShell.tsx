import { ReactNode, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Bell,
  Building2,
  Code2,
  CreditCard,
  History,
  KeyRound,
  Palette,
  Plug,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  User,
  Users,
  FolderCheck,
} from "lucide-react";
import { AppLayout } from "@/components/layout";
import { cn } from "@/lib/utils";

interface SettingsNavItem {
  href: string;
  label: string;
  description: string;
  icon: typeof User;
}

const NAV: { group: string; items: SettingsNavItem[] }[] = [
  {
    group: "Pessoal",
    items: [
      { href: "/definicoes/perfil", label: "Perfil", description: "Como apareces aos outros utilizadores da plataforma.", icon: User },
      { href: "/definicoes/conta", label: "Conta e acesso", description: "Credenciais, sessões ativas e autenticação.", icon: KeyRound },
      { href: "/definicoes/notificacoes", label: "Notificações", description: "Escolhe o que chega por email, push e in-app.", icon: Bell },
      { href: "/definicoes/aparencia", label: "Aparência e idioma", description: "Tema, densidade e formato regional.", icon: Palette },
    ],
  },
  {
    group: "Organização",
    items: [
      { href: "/definicoes/organizacao", label: "Perfil da organização", description: "Visível aos fornecedores em RFQs e propostas.", icon: Building2 },
      { href: "/definicoes/equipa", label: "Equipa e permissões", description: "Membros ativos, convites e papéis atribuídos.", icon: Users },
      { href: "/definicoes/papeis", label: "Papéis e níveis", description: "Matriz simplificada de permissões.", icon: ShieldCheck },
      { href: "/definicoes/faturacao", label: "Faturação e plano", description: "Subscrição, método de pagamento e faturas.", icon: CreditCard },
      { href: "/definicoes/folha-fecho-qualidades", label: "Folha de fecho", description: "Catálogo técnico de qualidades.", icon: FolderCheck },
    ],
  },
  {
    group: "Plataforma",
    items: [
      { href: "/definicoes/integracoes", label: "Integrações", description: "Stripe, faturação e webhooks.", icon: Plug },
      { href: "/definicoes/preferencias", label: "API e webhooks", description: "Chaves de API e endpoints.", icon: Code2 },
      { href: "/definicoes/auditoria", label: "Auditoria e histórico", description: "Ações críticas e logs.", icon: History },
      { href: "/definicoes/legal", label: "Legal e conformidade", description: "RGPD, exportação e retenção.", icon: Shield },
    ],
  },
];

const PREVIEW_ROLES = [
  { value: "admin", label: "Admin da org" },
  { value: "owner", label: "Owner" },
  { value: "revisor", label: "Revisor" },
  { value: "orcamentista", label: "Orçamentista" },
  { value: "leitor", label: "Leitor" },
];

interface DefinicoesShellProps {
  children?: ReactNode;
}

export function DefinicoesShell({ children }: DefinicoesShellProps) {
  const { pathname } = useLocation();
  const [previewRole, setPreviewRole] = useState("admin");
  const active = NAV.flatMap((g) => g.items).find((i) => pathname.startsWith(i.href));

  return (
    <AppLayout
      title="Definições"
      subtitle="Gestão da tua conta, organização, equipa e preferências."
    >
      <div className="p-4 md:p-6 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className="space-y-6">
              {/* Header block */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Definições
                </p>
                <h1 className="mt-1 text-xl font-semibold text-text-strong">Configuração</h1>
              </div>

              {/* Preview-as selector */}
              <div className="rounded-xl border border-border-subtle bg-surface-elevated p-3">
                <label
                  htmlFor="preview-role"
                  className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted"
                >
                  Pré-visualizar como
                </label>
                <select
                  id="preview-role"
                  value={previewRole}
                  onChange={(e) => setPreviewRole(e.target.value)}
                  className="mt-2 w-full rounded-md border border-border-subtle bg-background px-2 py-1.5 text-sm text-text-strong focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {PREVIEW_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[11px] leading-snug text-text-muted">
                  Oculta/mostra secções conforme permissões.
                </p>
              </div>

              {/* Grouped nav */}
              <nav className="space-y-5">
                {NAV.map((group) => (
                  <div key={group.group}>
                    <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                      {group.group}
                    </p>
                    <ul className="space-y-0.5">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <NavLink
                            to={item.href}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                                isActive
                                  ? "bg-surface-sunken font-semibold text-text-strong"
                                  : "text-text-muted hover:bg-surface-sunken/60 hover:text-text-strong",
                              )
                            }
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 space-y-6">
            {active && (
              <header className="border-b border-border-subtle pb-4">
                <h2 className="text-2xl font-semibold text-text-strong">{active.label}</h2>
                <p className="mt-1 text-sm text-text-muted">{active.description}</p>
              </header>
            )}
            {children ?? <Outlet />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
