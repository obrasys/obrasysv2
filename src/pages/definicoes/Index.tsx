import { Link } from "react-router-dom";
import {
  Bell,
  Building2,
  CreditCard,
  FolderCheck,
  History,
  KeyRound,
  Library,
  Palette,
  Plug,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  User,
  Users,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionLink {
  href: string;
  label: string;
  description: string;
  icon: typeof User;
}

const GROUPS: { group: string; items: SectionLink[] }[] = [
  {
    group: "Pessoal",
    items: [
      { href: "/definicoes/perfil", label: "Perfil", description: "Identidade, foto, cargo e bio", icon: User },
      { href: "/definicoes/conta", label: "Conta e acesso", description: "Email, palavra-passe, 2FA e sessões", icon: KeyRound },
      { href: "/definicoes/notificacoes", label: "Notificações", description: "Matriz de canais por categoria", icon: Bell },
      { href: "/definicoes/aparencia", label: "Aparência e idioma", description: "Tema, densidade e idioma da app", icon: Palette },
    ],
  },
  {
    group: "Organização",
    items: [
      { href: "/definicoes/organizacao", label: "Perfil da organização", description: "Dados fiscais, marca e morada", icon: Building2 },
      { href: "/definicoes/equipa", label: "Equipa e permissões", description: "Membros, convites e papéis", icon: Users },
      { href: "/definicoes/papeis", label: "Papéis e níveis", description: "Matriz de permissões por papel", icon: ShieldCheck },
      { href: "/definicoes/faturacao", label: "Faturação e plano", description: "Subscrição, faturas e limites", icon: CreditCard },
      { href: "/definicoes/folha-fecho-qualidades", label: "Folha de fecho — qualidades", description: "Catálogo técnico de qualidades", icon: FolderCheck },
      { href: "/definicoes/biblioteca-orcamentos", label: "Biblioteca de orçamentos", description: "Zonas, Áreas e Tipos de Serviço reutilizáveis", icon: Library },
    ],
  },
  {
    group: "Sistema",
    items: [
      { href: "/definicoes/integracoes", label: "Integrações", description: "Stripe, faturação e webhooks", icon: Plug },
      { href: "/definicoes/auditoria", label: "Auditoria e histórico", description: "Ações críticas e logs do sistema", icon: History },
      { href: "/definicoes/legal", label: "Legal e conformidade", description: "RGPD, exportação e retenção", icon: Shield },
      { href: "/definicoes/preferencias", label: "Preferências avançadas", description: "Axia, privacidade e opções legadas", icon: SettingsIcon },
    ],
  },
];

export default function DefinicoesIndex() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border-subtle bg-gradient-to-br from-primary/5 via-surface-elevated to-surface-elevated p-5 md:p-6 shadow-card">
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
            Centro de Definições
          </p>
          <h2 className="text-xl md:text-2xl font-semibold text-text-strong">
            Tudo o que precisas para configurar o Obra Sys
          </h2>
          <p className="max-w-2xl text-sm text-text-muted">
            Escolhe uma secção abaixo ou usa o menu lateral. As alterações são aplicadas
            imediatamente a toda a organização (quando aplicável).
          </p>
        </div>
      </section>

      {GROUPS.map((group) => (
        <section key={group.group} className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            {group.group}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-elevated p-4 shadow-card transition-all",
                  "hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-text-strong">
                      {item.label}
                    </p>
                    <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <p className="mt-1 text-xs text-text-muted line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
