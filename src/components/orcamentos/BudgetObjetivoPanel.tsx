import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, TargetIcon, History, AlertCircle, Lock } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { ClosingSheet } from "@/hooks/useClosingSheets";
import {
  type ClosingSheetDetails,
  type ClosingDirectCostLine,
  DEFAULT_DIRECT_COST_LINES,
  mergeDetails,
  computeClosingTotals,
} from "@/types/closing-sheet";

interface Props {
  orcamentoId: string;
}

const fmtEUR = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v ?? 0);

// ── Hook: lista todas as folhas (Base + Budget Objetivo Vx) deste orçamento ──
function useBudgetObjetivoSheets(orcamentoId: string) {
  return useQuery({
    queryKey: ["budget-objetivo-sheets", orcamentoId],
    enabled: !!orcamentoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("closing_sheets")
        .select("*")
        .eq("source_budget_id", orcamentoId)
        .eq("closing_type", "initial")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClosingSheet[];
    },
  });
}

export function BudgetObjetivoPanel({ orcamentoId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: sheets = [], isLoading } = useBudgetObjetivoSheets(orcamentoId);

  const baseSheet = useMemo(
    () => sheets.find((s) => !s.version_label) ?? null,
    [sheets],
  );
  const objetivoSheets = useMemo(
    () =>
      sheets
        .filter((s) => s.version_label?.startsWith("Budget Objetivo V"))
        .sort((a, b) => {
          const na = parseInt(a.version_label!.replace(/\D/g, ""), 10) || 0;
          const nb = parseInt(b.version_label!.replace(/\D/g, ""), 10) || 0;
          return nb - na;
        }),
    [sheets],
  );

  const latestVersion = objetivoSheets[0] ?? null;
  const [selectedId, setSelectedId] = useState<string | "base" | null>(null);
  useEffect(() => {
    if (selectedId) return;
    if (latestVersion) setSelectedId(latestVersion.id);
    else if (baseSheet) setSelectedId("base");
  }, [latestVersion, baseSheet, selectedId]);

  const selectedSheet =
    selectedId === "base"
      ? baseSheet
      : objetivoSheets.find((s) => s.id === selectedId) ?? null;

  const isEditableSelection = selectedSheet?.id === latestVersion?.id && !!latestVersion;
  // Se ainda não há nenhuma versão "Budget Objetivo", permite editar à partida (clone da Base)
  const isCloningFromBase = !latestVersion && !!baseSheet;
  const canEdit = (isEditableSelection || isCloningFromBase) && !!baseSheet;

  // Estado local editável (clona detalhes da folha seleccionada ou da Base)
  const [draft, setDraft] = useState<ClosingSheetDetails | null>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const source = selectedSheet ?? baseSheet;
    if (!source) return;
    setDraft(mergeDetails(source.details));
    setDirty(false);
  }, [selectedSheet?.id, baseSheet?.id]);

  const totals = useMemo(
    () => (draft ? computeClosingTotals(draft) : null),
    [draft],
  );

  const updateLine = (key: string, patch: Partial<ClosingDirectCostLine>) => {
    if (!draft) return;
    const next: ClosingSheetDetails = {
      ...draft,
      direct_costs: draft.direct_costs.map((l) =>
        l.key === key ? { ...l, ...patch } : l,
      ),
    };
    setDraft(next);
    setDirty(true);
  };

  // ── Mutation: gravar nova versão "Budget Objetivo V(n+1)" ──
  const saveVersion = useMutation({
    mutationFn: async () => {
      if (!user?.id || !draft || !baseSheet) throw new Error("Estado inválido.");
      const nextNumber =
        (objetivoSheets[0]
          ? parseInt(objetivoSheets[0].version_label!.replace(/\D/g, ""), 10) || 0
          : 0) + 1;
      const t = computeClosingTotals(draft);
      const { error } = await supabase.from("closing_sheets").insert({
        source_budget_id: orcamentoId,
        obra_id: baseSheet.obra_id,
        user_id: user.id,
        closing_type: "initial",
        status: "draft",
        version_label: `Budget Objetivo V${nextNumber}`,
        details: draft as any,
        total_direct_cost: t.total_directos,
        total_indirect_cost: t.total_indiretos,
        site_costs: t.total_estaleiro,
        structure_costs: t.total_admin,
        contingency_amount: t.total_outros,
        margin_amount: t.rai_eur,
        margin_percent: t.rai_pct * 100,
        sale_price: t.valor_vendas,
        expected_result: t.rai_eur,
        notes: `Versão Budget Objetivo V${nextNumber}`,
      });
      if (error) throw error;
      return nextNumber;
    },
    onSuccess: (n) => {
      toast({
        title: `Budget Objetivo V${n} gravado`,
        description: "Nova versão criada e adicionada ao histórico.",
      });
      setDirty(false);
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["budget-objetivo-sheets", orcamentoId] });
      qc.invalidateQueries({ queryKey: ["closing-sheets", orcamentoId] });
    },
    onError: (e: any) =>
      toast({
        title: "Erro ao gravar versão",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!baseSheet) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-semibold mb-1">Budget ainda não disponível</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            O Budget herda a estrutura da <strong>Folha de Fecho Base</strong>.
            Crie primeiro a Folha de Fecho Base no separador correspondente.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Lista para o selector e para o histórico (do mais recente até à Base)
  const historyEntries: Array<{
    id: string;
    label: string;
    sheet: ClosingSheet;
    isBase: boolean;
  }> = [
    ...objetivoSheets.map((s) => ({
      id: s.id,
      label: s.version_label!,
      sheet: s,
      isBase: false,
    })),
    { id: "base", label: "Folha de Fecho Base", sheet: baseSheet, isBase: true },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      {/* ── Coluna principal ── */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <TargetIcon className="h-4 w-4 text-primary" />
                {latestVersion
                  ? `Budget Objetivo · ${latestVersion.version_label}`
                  : "Budget Objetivo (a partir da Base)"}
              </span>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedId ?? ""}
                  onValueChange={(v) => setSelectedId(v as string)}
                >
                  <SelectTrigger className="h-8 text-xs w-[220px]">
                    <SelectValue placeholder="Selecionar versão" />
                  </SelectTrigger>
                  <SelectContent>
                    {historyEntries.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.label}
                        {h.id === latestVersion?.id ? " · Atual" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => saveVersion.mutate()}
                  disabled={!canEdit || !dirty || saveVersion.isPending}
                >
                  {saveVersion.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Gravar nova versão
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          {totals && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <KPI label="Total Custos Diretos" value={fmtEUR(totals.total_directos)} />
                <KPI label="Estaleiro" value={fmtEUR(totals.total_estaleiro)} />
                <KPI label="Custo Industrial" value={fmtEUR(totals.custo_industrial)} highlight />
                <KPI label="PV (Vendas)" value={fmtEUR(totals.valor_vendas)} />
                <KPI
                  label="RAI"
                  value={`${fmtEUR(totals.rai_eur)} · ${(totals.rai_pct * 100).toFixed(1)}%`}
                  highlight
                />
              </div>
              {!canEdit && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> Versão histórica em modo só-leitura.
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* ── Tabela de Custos Diretos (38 capítulos) ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Custos Diretos / Preços Secos — Valores s/ IVA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[55%]">Capítulo</TableHead>
                    <TableHead className="text-right w-[140px]">Valor (€)</TableHead>
                    <TableHead className="text-right w-[100px]">Desc. %</TableHead>
                    <TableHead className="w-[140px]">Empresa</TableHead>
                    <TableHead className="w-[180px]">Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(draft?.direct_costs ?? DEFAULT_DIRECT_COST_LINES).map((line) => {
                    const desc = Number(line.desconto_pct) || 0;
                    const liquido = (Number(line.value) || 0) * (1 - desc / 100);
                    return (
                      <TableRow key={line.key}>
                        <TableCell className="text-sm">
                          <div className="font-medium leading-tight">{line.label}</div>
                          {desc > 0 && (
                            <div className="text-[11px] text-muted-foreground">
                              Líquido: {fmtEUR(liquido)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            disabled={!canEdit}
                            value={line.value ?? 0}
                            onChange={(e) =>
                              updateLine(line.key, { value: Number(e.target.value) || 0 })
                            }
                            className="h-8 text-right text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.5"
                            min={0}
                            max={100}
                            disabled={!canEdit}
                            value={line.desconto_pct ?? 0}
                            onChange={(e) =>
                              updateLine(line.key, {
                                desconto_pct: Math.max(
                                  0,
                                  Math.min(100, Number(e.target.value) || 0),
                                ),
                              })
                            }
                            className="h-8 text-right text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            disabled={!canEdit}
                            value={line.empresa ?? ""}
                            onChange={(e) => updateLine(line.key, { empresa: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            disabled={!canEdit}
                            value={line.notas ?? ""}
                            onChange={(e) => updateLine(line.key, { notas: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Coluna lateral: histórico ── */}
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Histórico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {historyEntries.map((h) => {
              const isActive = selectedId === h.id || (selectedId === null && h.isBase && !latestVersion);
              const isCurrent = h.id === latestVersion?.id;
              return (
                <button
                  key={h.id}
                  onClick={() => setSelectedId(h.id)}
                  className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold leading-tight">{h.label}</p>
                    {h.isBase ? (
                      <Badge variant="outline" className="text-[10px]">
                        Base
                      </Badge>
                    ) : isCurrent ? (
                      <Badge className="text-[10px]">Atual</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Histórico
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {format(new Date(h.sheet.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Diretos: {fmtEUR(h.sheet.total_direct_cost ?? 0)}
                  </p>
                </button>
              );
            })}
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
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
