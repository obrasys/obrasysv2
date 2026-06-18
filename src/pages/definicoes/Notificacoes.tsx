import { Bell, Mail, Smartphone, MessageSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/patterns";
import { useUserSettings } from "@/hooks/useUserSettings";

type Channel = "email" | "push" | "inapp" | "future";
const channels: { key: Channel; label: string; icon: typeof Mail; available: boolean }[] = [
  { key: "email", label: "Email", icon: Mail, available: true },
  { key: "push", label: "Push", icon: Smartphone, available: true },
  { key: "inapp", label: "Na app", icon: Bell, available: true },
  { key: "future", label: "WhatsApp / Slack", icon: MessageSquare, available: false },
];

type CategoryKey =
  | "axia"
  | "orcamentos"
  | "obras"
  | "rfqs"
  | "aprovacoes"
  | "financeiro"
  | "documentos"
  | "equipa";

const categories: { key: CategoryKey; label: string; description: string }[] = [
  { key: "axia", label: "Axia", description: "Sugestões e alertas do agente IA" },
  { key: "orcamentos", label: "Orçamentos", description: "Estado e atualizações de propostas" },
  { key: "obras", label: "Obras", description: "RDOs, autos, desvios e progresso" },
  { key: "rfqs", label: "RFQs", description: "Cotações e respostas de fornecedores" },
  { key: "aprovacoes", label: "Aprovações", description: "Itens pendentes de aprovação" },
  { key: "financeiro", label: "Financeiro", description: "Recebimentos, faturação, alertas" },
  { key: "documentos", label: "Documentos", description: "Novos ficheiros e revisões" },
  { key: "equipa", label: "Equipa", description: "Convites e alterações de permissões" },
];

// Map categories → existing user_settings keys (best-effort; UI placeholder for missing ones)
const settingKeyMap: Partial<Record<`${CategoryKey}_${Channel}`, keyof ReturnType<typeof useUserSettings>["settings"]>> = {
  orcamentos_email: "email_orcamentos",
  obras_email: "email_rdos",
  aprovacoes_email: "email_alertas",
  financeiro_email: "email_relatorios",
  obras_push: "push_tarefas",
  aprovacoes_push: "push_alertas",
};

export default function DefinicoesNotificacoes() {
  const { settings, updateSetting } = useUserSettings();
  const pushEnabled = settings.push_enabled;

  return (
    <SectionCard
      title="Matriz de notificações"
      description="Escolhe os canais por categoria. Canais futuros (WhatsApp/Slack) ficarão disponíveis em breve."
      padded={false}
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-sunken/60">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Categoria
              </th>
              {channels.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-text-muted"
                >
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <c.icon className="h-3.5 w-3.5" />
                    {c.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.key} className="border-t border-border-subtle">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-text-strong">{cat.label}</p>
                  <p className="text-xs text-text-muted">{cat.description}</p>
                </td>
                {channels.map((ch) => {
                  const mapKey = `${cat.key}_${ch.key}` as keyof typeof settingKeyMap;
                  const settingKey = settingKeyMap[mapKey];
                  const checked = settingKey ? Boolean(settings[settingKey]) : false;
                  const disabled = !ch.available || (ch.key === "push" && !pushEnabled) || !settingKey;
                  return (
                    <td key={ch.key} className="px-4 py-3 text-center">
                      <Switch
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={(v) => settingKey && updateSetting(settingKey, v)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
