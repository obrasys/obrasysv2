import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  History,
  Eye,
} from "lucide-react";
import {
  useUpdateIntakeStatus,
  useIntakeItemHistory,
  useLogIntakeAction,
  type IntakeItem,
  type IntakeHistoryEntry,
} from "@/hooks/useAxiaVoiceIntake";
import { Link } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";

const TYPE_LABEL: Record<string, string> = {
  pre_budget: "Pré-Orçamento",
  rdo: "RDO",
  financial_record: "Financeiro",
  material_need: "Material",
  task: "Tarefa",
  unknown: "Desconhecido",
};

const STATUS_LABEL: Record<string, string> = {
  pending_review: "Pendente",
  needs_more_info: "Precisa info",
  approved: "Aprovado",
  converted: "Convertido",
  rejected: "Rejeitado",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending_review: "secondary",
  needs_more_info: "outline",
  approved: "default",
  converted: "default",
  rejected: "destructive",
};

const ACTION_LABEL: Record<string, { label: string; cls: string }> = {
  accepted: { label: "Aceite", cls: "text-emerald-600" },
  rejected: { label: "Rejeitado", cls: "text-destructive" },
  converted: { label: "Convertido", cls: "text-primary" },
  marked_needs_info: { label: "Pediu mais info", cls: "text-yellow-600" },
  opened: { label: "Aberto", cls: "text-muted-foreground" },
  status_changed: { label: "Estado alterado", cls: "text-muted-foreground" },
};

export type IntakeItemWithObra = IntakeItem & {
  obra: { id: string; nome: string } | null;
};

const targetUrl = (it: IntakeItem) => {
  if (!it.target_entity_id) return null;
  switch (it.target_entity_type) {
    case "rdo":
      return `/rdos/${it.target_entity_id}`;
    case "financial_record":
      return `/financeiro`;
    case "pre_budget":
      return `/axia/inbox`;
    default:
      return null;
  }
};

function HistoryTimeline({ itemId }: { itemId: string }) {
  const { data, isLoading } = useIntakeItemHistory(itemId);
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" /> A carregar histórico...
      </div>
    );
  }
  const entries = data ?? [];
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">Sem ações registadas ainda.</p>;
  }
  return (
    <ol className="space-y-2 border-l border-border pl-4 ml-1 mt-2">
      {entries.map((e: IntakeHistoryEntry) => {
        const meta = ACTION_LABEL[e.action] ?? { label: e.action, cls: "text-muted-foreground" };
        const who = e.actor?.nome || e.actor?.email || "Utilizador";
        return (
          <li key={e.id} className="relative">
            <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
            <div className="flex items-center gap-2 text-sm">
              <span className={`font-medium ${meta.cls}`}>{meta.label}</span>
              <span className="text-muted-foreground">por {who}</span>
            </div>
            <div
              className="text-xs text-muted-foreground"
              title={format(new Date(e.created_at), "dd/MM/yyyy HH:mm:ss")}
            >
              {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: pt })}
              {e.from_status && e.to_status && e.from_status !== e.to_status && (
                <> · {e.from_status} → {e.to_status}</>
              )}
            </div>
            {e.notes && <p className="text-xs mt-0.5">{e.notes}</p>}
          </li>
        );
      })}
    </ol>
  );
}

function useIntakeItemById(id: string | null, fallback?: IntakeItemWithObra | null) {
  return useQuery({
    queryKey: ["axia-intake-item", id],
    enabled: !!id && !fallback,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("axia_intake_items")
        .select("*, obra:obra_id(id, nome)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as IntakeItemWithObra | null;
    },
  });
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Pass when you already have the full item (e.g. inbox list) */
  item?: IntakeItemWithObra | null;
  /** Pass when only the id is known (e.g. dashboard alert) */
  itemId?: string | null;
}

export function AxiaIntakeReviewDialog({ open, onOpenChange, item, itemId }: Props) {
  const update = useUpdateIntakeStatus();
  const log = useLogIntakeAction();
  const [showHistory, setShowHistory] = useState(false);

  const effectiveId = item?.id ?? itemId ?? null;
  const { data: fetched, isLoading } = useIntakeItemById(effectiveId, item);
  const current: IntakeItemWithObra | null = item ?? fetched ?? null;

  useEffect(() => {
    if (!open) setShowHistory(false);
  }, [open]);

  if (!open) return null;

  const conf = current ? Math.round((current.confidence ?? 0) * 100) : 0;
  const url = current ? targetUrl(current) : null;

  const handleApprove = () => {
    if (!current) return;
    update.mutate(
      { id: current.id, status: "approved", fromStatus: current.status },
      { onSuccess: () => onOpenChange(false) }
    );
  };
  const handleReject = () => {
    if (!current) return;
    update.mutate(
      { id: current.id, status: "rejected", fromStatus: current.status },
      { onSuccess: () => onOpenChange(false) }
    );
  };
  const toggleHistory = () => {
    if (!current) return;
    const next = !showHistory;
    setShowHistory(next);
    if (next) log.mutate({ itemId: current.id, action: "opened" });
  };

  const data = (current?.extracted_data ?? {}) as Record<string, any>;
  const transcript =
    (data.transcript as string) ||
    (data.original_command as string) ||
    (data.command as string) ||
    "";
  const explanation = (data.explanation as string) || (data.reasoning as string) || "";

  const renderExtracted = () => {
    if (!current) return null;
    const rows: { label: string; value: string }[] = [];
    if (current.item_type === "financial_record") {
      if (data.amount != null) rows.push({ label: "Valor", value: `${data.amount}` });
      if (data.currency) rows.push({ label: "Moeda", value: String(data.currency) });
      if (data.category) rows.push({ label: "Categoria", value: String(data.category) });
      if (current.obra?.nome) rows.push({ label: "Obra", value: current.obra.nome });
      if (data.date) rows.push({ label: "Data", value: String(data.date) });
      if (data.description) rows.push({ label: "Descrição", value: String(data.description) });
    } else if (current.item_type === "rdo") {
      if (current.obra?.nome) rows.push({ label: "Obra", value: current.obra.nome });
      if (data.date) rows.push({ label: "Data", value: String(data.date) });
      if (Array.isArray(data.activities))
        rows.push({ label: "Atividades", value: data.activities.join(", ") || "—" });
      if (Array.isArray(data.missing_materials))
        rows.push({
          label: "Materiais em falta",
          value: data.missing_materials.join(", ") || "—",
        });
      if (data.notes) rows.push({ label: "Observações", value: String(data.notes) });
    } else if (current.item_type === "pre_budget") {
      if (data.title) rows.push({ label: "Título", value: String(data.title) });
      if (data.area) rows.push({ label: "Área", value: String(data.area) });
      if (Array.isArray(data.services))
        rows.push({ label: "Serviços", value: data.services.join(", ") || "—" });
    } else {
      Object.entries(data).forEach(([k, v]) => {
        if (["transcript", "explanation", "reasoning", "command", "original_command"].includes(k))
          return;
        if (v == null || typeof v === "object") return;
        rows.push({ label: k, value: String(v) });
      });
    }
    if (rows.length === 0) {
      return (
        <p className="text-xs text-muted-foreground italic">
          Sem dados estruturados extraídos.
        </p>
      );
    }
    return (
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col">
            <dt className="text-muted-foreground capitalize">{r.label}</dt>
            <dd className="font-medium text-foreground break-words">{r.value}</dd>
          </div>
        ))}
      </dl>
    );
  };

  const finalLabel =
    current?.item_type === "financial_record"
      ? "Finalizar despesa"
      : current?.item_type === "rdo"
        ? "Finalizar RDO"
        : current?.item_type === "pre_budget"
          ? "Converter em orçamento"
          : "Finalizar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading || !current ? (
          <div className="flex items-center gap-2 py-10 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> A carregar...
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="secondary">
                  {TYPE_LABEL[current.item_type] ?? current.item_type}
                </Badge>
                <Badge variant={STATUS_VARIANT[current.status] ?? "outline"}>
                  {STATUS_LABEL[current.status] ?? current.status}
                </Badge>
                {conf > 0 && (
                  <span className="text-xs text-muted-foreground">{conf}% confiança</span>
                )}
              </div>
              <DialogTitle className="text-left flex items-center gap-2">
                <span className="text-primary">Revisão Axia</span>
                <span className="text-muted-foreground font-normal">·</span>
                <span className="font-semibold">{current.title}</span>
              </DialogTitle>
              {current.summary && (
                <DialogDescription className="text-left">{current.summary}</DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4 text-sm">
              {/* 1. Comando original */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Comando original
                </h3>
                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm italic text-foreground">
                  {transcript ? `"${transcript}"` : (
                    <span className="text-muted-foreground not-italic">
                      Transcrição não disponível.
                    </span>
                  )}
                </div>
              </section>

              {/* 2. Interpretação da Axia */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Interpretação da Axia
                </h3>
                <div className="rounded-lg border px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Tipo identificado:</span>
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                      {TYPE_LABEL[current.item_type] ?? current.item_type}
                    </Badge>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">Confiança:</span>
                    <span className="font-medium">{conf}%</span>
                  </div>
                  {explanation && (
                    <p className="text-xs text-foreground/90">{explanation}</p>
                  )}
                </div>
              </section>

              {/* 3. Dados extraídos */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Dados extraídos
                </h3>
                <div className="rounded-lg border px-3 py-2.5">{renderExtracted()}</div>
              </section>

              {/* Faltas e perguntas */}
              {current.missing_fields?.length > 0 && (
                <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-800">
                  <span className="font-medium">Em falta:</span>{" "}
                  {current.missing_fields.join(", ")}
                </div>
              )}
              {current.axia_questions?.length > 0 && (
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <p className="text-xs font-medium mb-1">Perguntas da Axia:</p>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                    {current.axia_questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Histórico */}
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 px-2 h-7 text-xs"
                  onClick={toggleHistory}
                >
                  <History className="h-3.5 w-3.5" />
                  {showHistory ? "Ocultar histórico" : "Ver histórico de ações"}
                </Button>
                {showHistory && <HistoryTimeline itemId={current.id} />}
              </div>
            </div>

            <DialogFooter className="flex-row flex-wrap gap-2 sm:justify-between border-t pt-3">
              <div className="flex gap-2">
                {current.status !== "rejected" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-destructive"
                    onClick={handleReject}
                    disabled={update.isPending}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Rejeitar
                  </Button>
                )}
              </div>
              <div className="flex gap-2 ml-auto flex-wrap">
                {url && (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() =>
                      log.mutate({
                        itemId: current.id,
                        action: "opened",
                        metadata: { target_url: url },
                      })
                    }
                  >
                    <Link to={url}>
                      <ExternalLink className="h-3.5 w-3.5" /> Abrir entidade
                    </Link>
                  </Button>
                )}
                {current.status !== "approved" && current.status !== "converted" && (
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1"
                    onClick={handleApprove}
                    disabled={update.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> {finalLabel}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AxiaIntakeReviewDialog;
