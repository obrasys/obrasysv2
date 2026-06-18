import { ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  CreditCard,
  FileText,
  KeyRound,
  Palette,
  Plug,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  User,
  Users,
  History,
  FolderCheck,
} from "lucide-react";
import { AppLayout } from "@/components/layout";
import { PageHeader } from "@/components/patterns";
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
      { href: "/definicoes/perfil", label: "Perfil", description: "Identidade e dados pessoais", icon: User },
      { href: "/definicoes/conta", label: "Conta e acesso", description: "Email, 2FA e sessões", icon: KeyRound },
      { href: "/definicoes/notificacoes", label: "Notificações", description: "Canais e categorias", icon: Bell },
      { href: "/definicoes/aparencia", label: "Aparência e idioma", description: "Tema, densidade, idioma", icon: Palette },
    ],
  },
  {
    group: "Organização",
    items: [
      { href: "/definicoes/organizacao", label: "Perfil da organização", description: "Razão social, fiscais, marca", icon: Building2 },
      { href: "/definicoes/equipa", label: "Equipa e permissões", description: "Membros, convites, papéis", icon: Users },
      { href: "/definicoes/papeis", label: "Papéis e níveis", description: "Matriz de permissões", icon: ShieldCheck },
      { href: "/definicoes/faturacao", label: "Faturação e plano", description: "Subscrição, faturas, limites", icon: CreditCard },
      { href: "/definicoes/folha-fecho-qualidades", label: "Folha de fecho — qualidades", description: "Catálogo técnico", icon: FolderCheck },
    ],
  },
  {
    group: "Sistema",
    items: [
      { href: "/definicoes/integracoes", label: "Integrações", description: "Stripe, faturação, webhooks", icon: Plug },
      { href: "/definicoes/auditoria", label: "Auditoria e histórico", description: "Ações críticas e logs", icon: History },
      { href: "/definicoes/legal", label: "Legal e conformidade", description: "RGPD, exportação, retenção", icon: Shield },
      { href: "/definicoes/preferencias", label: "Preferências avançadas", description: "Axia, privacidade legacy", icon: SettingsIcon },
    ],
  },
];

interface DefinicoesShellProps {
  children?: ReactNode;
}

export function DefinicoesShell({ children }: DefinicoesShellProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = NAV.flatMap((g) => g.items).find((i) => pathname.startsWith(i.href));

  return (
    <AppLayout
      title="Definições"
      subtitle="Gestão da tua conta, organização, equipa e preferências do Obra Sys."
    >
      <div className="p-4 md:p-6 lg:p-8">
        <PageHeader
          eyebrow="Definições"
          title={active?.label ?? "Definições"}
          subtitle={active?.description ?? "Escolhe uma secção para começar."}
        />
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <nav className="space-y-5 rounded-2xl border border-border-subtle bg-surface-elevated p-3 shadow-card">
              {NAV.map((group) => (
                <div key={group.group}>
                  <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {group.group}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <NavLink
                          to={item.href}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
                              isActive
                                ? "bg-primary/10 font-semibold text-primary"
                                : "text-text-muted hover:bg-surface-sunken hover:text-text-strong",
                            )
                          }
                          onClick={(e) => {
                            // Allow custom navigation for external pages already handled via routes
                            void e;
                          }}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-3 w-full text-left text-xs text-text-muted hover:text-text-strong"
            >
              ← Voltar
            </button>
          </aside>
          <div className="min-w-0 space-y-6">{children ?? <Outlet />}</div>
        </div>
      </div>
    </AppLayout>
  );
}
