import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, History, Loader2, Pencil, Plus, Save, TargetIcon } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  useBudgetWorkingVersions,
  useCreateBudgetWorkingVersion,
  useLockBudgetWorkingVersion,
} from "@/hooks/useBudgetWorkingVersions";
import { useOrcamento } from "@/hooks/useOrcamentos";

interface Props {
  /** Id do orçamento base (locked) */
  baseOrcamentoId: string;
}

const fmtEUR = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v ?? 0);

export function BudgetWorkingPanel({ baseOrcamentoId }: Props) {
  const navigate = useNavigate();
  const { orcamento: base } = useOrcamento(baseOrcamentoId);
  const { data: versions = [], isLoading } = useBudgetWorkingVersions(baseOrcamentoId);
  const createVersion = useCreateBudgetWorkingVersion();
  const lockVersion = useLockBudgetWorkingVersion();

  const activeVersion = useMemo(
    () => versions.find((v) => v.budget_version_status === "active"),
    [versions],
  );
  const baseTotal = Number(base?.valor_total ?? 0);

  const handleCreateFirst = () =>
    createVersion.mutate({ baseId: baseOrcamentoId });

  const handleSaveAndOpenNew = async () => {
    if (!activeVersion) return;
    // Fecha a ativa e cria nova a partir dela (último estado vira ponto de partida)
    await lockVersion.mutateAsync({ budgetId: activeVersion.id, baseId: baseOrcamentoId });
    await createVersion.mutateAsync({
      baseId: baseOrcamentoId,
      cloneFrom: activeVersion.id,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Caso inicial: sem versões
  if (versions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center space-y-4">
          <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground" />
          <div>
            <p className="font-semibold mb-1">Budget ainda não iniciado</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              O Budget é uma <strong>cópia editável</strong> do Orçamento Base.
              Cria a primeira versão para começar a reorçamentar — o Orçamento
              Base permanece bloqueado e intacto.
            </p>
          </div>
          <Button
            onClick={handleCreateFirst}
            disabled={createVersion.isPending}
            size="lg"
          >
            {createVersion.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Criar primeira versão (V1)
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
      {/* Coluna principal */}
      <div className="space-y-4">
        {/* Header da versão ativa */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <TargetIcon className="h-4 w-4 text-primary" />
                {activeVersion
                  ? `Budget V${activeVersion.budget_version_number} · Ativa`
                  : "Sem versão ativa"}
              </span>
              <div className="flex items-center gap-2">
                {activeVersion && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/orcamentos/${activeVersion.id}/editar`)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Editar artigos
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveAndOpenNew}
                      disabled={lockVersion.isPending || createVersion.isPending}
                    >
                      {(lockVersion.isPending || createVersion.isPending) ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Gravar V{activeVersion.budget_version_number} e abrir V{activeVersion.budget_version_number + 1}
                    </Button>
                  </>
                )}
                {!activeVersion && (
                  <Button
                    size="sm"
                    onClick={() =>
                      createVersion.mutate({
                        baseId: baseOrcamentoId,
                        cloneFrom: versions[0]?.id,
                      })
                    }
                    disabled={createVersion.isPending}
                  >
                    {createVersion.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Abrir nova versão
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          {activeVersion && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <KPI label="Total Base" value={fmtEUR(baseTotal)} />
                <KPI
                  label={`Total V${activeVersion.budget_version_number}`}
                  value={fmtEUR(activeVersion.valor_total)}
                  highlight
                />
                <KPI
                  label="Desvio vs Base"
                  value={fmtEUR(activeVersion.valor_total - baseTotal)}
                  tone={
                    activeVersion.valor_total > baseTotal
                      ? "negative"
                      : activeVersion.valor_total < baseTotal
                      ? "positive"
                      : undefined
                  }
                />
                <KPI
                  label="Atualizado"
                  value={format(new Date(activeVersion.updated_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Clica em <strong>Editar artigos</strong> para abrir o editor completo
                (capítulos, adicionar artigos da Base de Preços, IA, paramétrico,
                descontos por capítulo). Quando gravares a versão, ficará bloqueada
                no histórico e abre automaticamente uma nova versão a partir dela.
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Sidebar: histórico */}
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Histórico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {versions.map((v) => {
              const isActive = v.budget_version_status === "active";
              return (
                <button
                  key={v.id}
                  onClick={() => navigate(`/orcamentos/${v.id}/editar`)}
                  className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold leading-tight">
                      Budget V{v.budget_version_number}
                    </p>
                    {isActive ? (
                      <Badge className="text-[10px]">Ativa</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Histórico
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {format(new Date(v.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Total: {fmtEUR(v.valor_total)}
                  </p>
                </button>
              );
            })}

            {/* Entrada Base (referência) */}
            <div className="rounded-lg border border-dashed p-2.5 mt-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold leading-tight">Orçamento Base</p>
                <Badge variant="outline" className="text-[10px]">
                  Base
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Total: {fmtEUR(baseTotal)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "positive" | "negative";
}) {
  const toneClass =
    tone === "negative"
      ? "text-rose-600"
      : tone === "positive"
      ? "text-emerald-600"
      : "";
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`font-semibold ${highlight ? "text-primary" : ""} ${toneClass}`}
      >
        {value}
      </p>
    </div>
  );
}
