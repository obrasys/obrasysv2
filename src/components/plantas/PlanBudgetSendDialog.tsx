import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Layers, AlertTriangle, ShieldAlert } from "lucide-react";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { PlanQuantitativoRow } from "@/hooks/usePlanQuantitativos";
import { useCanSendPlanToBudget } from "@/hooks/useCanSendPlanToBudget";
import { Checkbox } from "@/components/ui/checkbox";
import type { PlanDisciplina } from "@/types/plan-measurements";
import { DISCIPLINE_META } from "@/lib/plan-discipline";

type GroupBy = "source" | "camada" | "floor" | "single";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: PlanQuantitativoRow[];
  obraId: string;
  planName?: string;
  floorMap?: Map<string, string>;
  /** Para validações de calibração / risco Axia (Fase 3). */
  planImportId?: string;
  pageId?: string | null;
  floorId?: string | null;
  /** Disciplina da planta — usada como prefixo no título dos capítulos. */
  disciplina?: PlanDisciplina | null;
}

const SOURCE_LABEL: Record<string, string> = {
  medicao: "Medições",
  compartimento: "Compartimentos",
  especialidade: "Especialidades",
  escada: "Escadas",
  outros: "Outros",
};

export function PlanBudgetSendDialog({
  open,
  onOpenChange,
  rows,
  obraId,
  planName,
  floorMap,
  planImportId,
  pageId,
  floorId,
  disciplina,
}: Props) {
  const { orcamentos, createOrcamento } = useOrcamentos();
  const obraOrcamentos = (orcamentos ?? []).filter((o) => o.obra_id === obraId);

  const disciplineLabel = disciplina && disciplina !== "arquitetura" && disciplina !== "estruturas"
    ? DISCIPLINE_META[disciplina]?.label
    : null;
  const prefix = disciplineLabel ? `${disciplineLabel} — ` : "";

  // "__new__" is a sentinel meaning "create a new budget on the fly".
  const NEW_BUDGET = "__new__";
  const [orcamentoId, setOrcamentoId] = useState<string>(
    obraOrcamentos.length === 0 ? NEW_BUDGET : "",
  );
  const defaultNewTitle = planName ? `Orçamento — ${planName}` : "Orçamento da Planta";
  const [newBudgetTitle, setNewBudgetTitle] = useState(defaultNewTitle);
  const [groupBy, setGroupBy] = useState<GroupBy>(disciplineLabel ? "single" : "source");
  const [chapterTitle, setChapterTitle] = useState(
    disciplineLabel
      ? `${disciplineLabel}${planName ? ` — ${planName}` : ""}`
      : planName ? `Quantitativos — ${planName}` : "Quantitativos da Planta",
  );
  const [sending, setSending] = useState(false);
  const [confirmedWarnings, setConfirmedWarnings] = useState(false);

  const guard = useCanSendPlanToBudget(planImportId ?? null, pageId ?? null, floorId ?? null);

  const groups = useMemo(() => {
    const map = new Map<string, PlanQuantitativoRow[]>();
    for (const r of rows) {
      let key: string;
      if (groupBy === "single") key = chapterTitle || "Quantitativos";
      else if (groupBy === "source") key = `${prefix}${SOURCE_LABEL[r.source] ?? r.source}`;
      else if (groupBy === "camada") key = `${prefix}${r.camada || "Geral"}`;
      else key = `${prefix}${r.floor_id ? floorMap?.get(r.floor_id) ?? "Pavimento" : "Sem pavimento"}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [rows, groupBy, chapterTitle, floorMap, prefix]);

  const handleSend = async () => {
    if (!orcamentoId) {
      toast.error("Selecione um orçamento");
      return;
    }
    if (rows.length === 0) {
      toast.error("Sem linhas para enviar");
      return;
    }
    if (planImportId && !guard.ok) {
      toast.error("Não é possível enviar: " + guard.reasons.join(" "));
      return;
    }
    if (planImportId && guard.requiresExplicitConfirmation && !confirmedWarnings) {
      toast.warning("Confirme os avisos antes de enviar.");
      return;
    }
    if (orcamentoId === NEW_BUDGET && !newBudgetTitle.trim()) {
      toast.error("Indique o título do novo orçamento");
      return;
    }
    setSending(true);
    try {
      // 0. Criar orçamento se o utilizador escolheu "Novo orçamento"
      let targetOrcamentoId = orcamentoId;
      if (orcamentoId === NEW_BUDGET) {
        console.info("[plan→budget] creating new budget", { obraId, title: newBudgetTitle });
        const created = await createOrcamento.mutateAsync({
          titulo: newBudgetTitle.trim(),
          obra_id: obraId,
          cliente_id: "",
          margem_lucro: 20,
          custos_indiretos: { items: [] } as any,
        } as any);
        targetOrcamentoId = created.id;
      }

      // Find next chapter number
      const { data: existing } = await supabase
        .from("capitulos_orcamento")
        .select("numero")
        .eq("orcamento_id", targetOrcamentoId)
        .order("numero", { ascending: false })
        .limit(1);
      let nextNum = (existing && existing.length > 0 ? existing[0].numero : 0) + 1;

      let totalArticles = 0;
      for (const [title, items] of groups) {
        const { data: chapter, error: chErr } = await supabase
          .from("capitulos_orcamento")
          .insert({
            orcamento_id: orcamentoId,
            numero: nextNum,
            titulo: title,
            ordem: nextNum,
          })
          .select()
          .single();
        if (chErr) throw chErr;

        const articles = items.map((r, idx) => ({
          capitulo_id: chapter.id,
          descricao: r.descricao,
          unidade: r.unidade,
          quantidade: Number(r.valor) || 0,
          preco_unitario: 0,
          ordem: idx + 1,
        }));
        if (articles.length > 0) {
          const { error: artErr } = await supabase
            .from("artigos_orcamento")
            .insert(articles);
          if (artErr) throw artErr;
          totalArticles += articles.length;
        }
        nextNum++;
      }

      toast.success(
        `${totalArticles} artigo(s) enviados em ${groups.length} capítulo(s)`,
      );
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao enviar: " + (e.message ?? e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Enviar para Orçamento
          </DialogTitle>
          <DialogDescription>
            {rows.length} quantitativo(s) selecionados. A Axia organiza-os em
            capítulos e artigos, mantendo as unidades originais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Validações Axia (Fase 3) */}
          {planImportId && guard.reasons.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex gap-2">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <div className="font-medium">Não é possível enviar:</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {guard.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            </div>
          )}
          {planImportId && guard.warnings.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-2">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <div className="font-medium">Avisos antes de enviar:</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {guard.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={confirmedWarnings}
                  onCheckedChange={(v) => setConfirmedWarnings(v === true)}
                />
                <span>Confirmo que revi os avisos e quero enviar mesmo assim.</span>
              </label>
            </div>
          )}
          {/* Orçamento */}
          <div className="space-y-1.5">
            <Label className="text-xs">Orçamento de destino</Label>
            <Select value={orcamentoId} onValueChange={setOrcamentoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar orçamento desta obra…" />
              </SelectTrigger>
              <SelectContent>
                {obraOrcamentos.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    Nenhum orçamento nesta obra
                  </SelectItem>
                ) : (
                  obraOrcamentos.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.titulo}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Group by */}
          <div className="space-y-1.5">
            <Label className="text-xs">Organizar capítulos por</Label>
            <RadioGroup
              value={groupBy}
              onValueChange={(v) => setGroupBy(v as GroupBy)}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { v: "source", l: "Tipo (medição, escada, …)" },
                { v: "camada", l: "Camada técnica" },
                { v: "floor", l: "Pavimento" },
                { v: "single", l: "Capítulo único" },
              ].map((opt) => (
                <label
                  key={opt.v}
                  className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/40 text-sm"
                >
                  <RadioGroupItem value={opt.v} />
                  {opt.l}
                </label>
              ))}
            </RadioGroup>
          </div>

          {groupBy === "single" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Título do capítulo</Label>
              <Input
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
              />
            </div>
          )}

          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              Pré-visualização: {groups.length} capítulo(s), {rows.length} artigo(s)
            </div>
            {rows.filter((r) => !Number(r.valor)).length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                ⚠️ {rows.filter((r) => !Number(r.valor)).length} item(s) sem quantidade
                (valor 0). Para vãos, rodapé e paredes, volte a executar a
                leitura da planta com a Axia — ela passou a calcular as
                quantidades automaticamente. Em alternativa, edite os valores
                na Tabela Unificada antes de enviar.
              </div>
            )}
            <div className="border rounded-md max-h-48 overflow-auto divide-y">
              {groups.map(([title, items]) => (
                <div key={title} className="p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{title}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {items.length} artigo(s)
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              sending ||
              !orcamentoId ||
              (!!planImportId && (!guard.ok || (guard.requiresExplicitConfirmation && !confirmedWarnings)))
            }
          >
            {sending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Enviar para orçamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
