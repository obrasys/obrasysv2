import { Check, Minus } from "lucide-react";
import { SectionCard } from "@/components/patterns";
import { ACCESS_PROFILES } from "@/config/accessProfiles";
import { MODULE_CODES } from "@/types/team";
import { cn } from "@/lib/utils";

const PERM_LABELS: Record<string, string> = {
  can_view: "Ver",
  can_create: "Criar",
  can_update: "Editar",
  can_delete: "Eliminar",
};

const MODULE_LABELS: Record<string, string> = {
  orcamentos: "Orçamentos",
  obras: "Obras",
  cronograma: "Cronograma",
  rdo: "RDOs",
  medicoes: "Medições",
  progresso: "Progresso",
  documentos: "Documentos",
  clientes: "Clientes",
  fornecedores: "Fornecedores",
  dashboards: "Dashboards",
  equipa: "Equipa",
  configuracoes: "Configurações",
  axia: "Axia",
};

export default function DefinicoesPapeis() {
  return (
    <SectionCard
      title="Matriz de permissões"
      description="Visão geral dos perfis de acesso e ações permitidas por módulo."
      padded={false}
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-sunken/60">
            <tr>
              <th className="sticky left-0 z-10 bg-surface-sunken/60 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Módulo
              </th>
              {ACCESS_PROFILES.map((profile) => (
                <th
                  key={profile.role}
                  className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-text-muted"
                >
                  {profile.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULE_CODES.map((code) => (
              <tr key={code} className="border-t border-border-subtle">
                <td className="sticky left-0 z-10 bg-surface-elevated px-4 py-3 font-medium text-text-strong">
                  {MODULE_LABELS[code] ?? code}
                </td>
                {ACCESS_PROFILES.map((profile) => {
                  const perm = profile.permissions.find((p) => p.module_code === code);
                  const count = perm
                    ? [perm.can_view, perm.can_create, perm.can_update, perm.can_delete].filter(Boolean).length
                    : 0;
                  return (
                    <td key={profile.role} className="px-4 py-3 text-center">
                      {count === 0 ? (
                        <Minus className="mx-auto h-4 w-4 text-text-muted/50" />
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          {(["can_view", "can_create", "can_update", "can_delete"] as const).map((key) => (
                            <span
                              key={key}
                              title={PERM_LABELS[key]}
                              className={cn(
                                "inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold",
                                perm?.[key]
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-text-muted/40",
                              )}
                            >
                              {perm?.[key] ? <Check className="h-3 w-3" /> : "·"}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border-subtle bg-surface-sunken/40 px-4 py-2.5 text-xs text-text-muted">
        Legenda: Ver · Criar · Editar · Eliminar. A atribuição de papéis por membro faz-se em Equipa e permissões.
      </p>
    </SectionCard>
  );
}
