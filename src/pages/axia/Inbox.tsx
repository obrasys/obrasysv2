import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  History,
  Eye,
  ChevronRight,
} from "lucide-react";
import {
  useIntakeItems,
  useUpdateIntakeStatus,
  useIntakeItemHistory,
  useLogIntakeAction,
  type IntakeItem,
  type IntakeHistoryEntry,
} from "@/hooks/useAxiaVoiceIntake";
import { useAxiaIntakeRealtimeNotifications } from "@/hooks/useAxiaIntakeRealtimeNotifications";
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

const ACTION_LABEL: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  accepted: { label: "Aceite", icon: CheckCircle2, cls: "text-emerald-600" },
  rejected: { label: "Rejeitado", icon: XCircle, cls: "text-destructive" },
  converted: { label: "Convertido", icon: CheckCircle2, cls: "text-primary" },
  marked_needs_info: { label: "Pediu mais info", icon: History, cls: "text-yellow-600" },
  opened: { label: "Aberto", icon: Eye, cls: "text-muted-foreground" },
  status_changed: { label: "Estado alterado", icon: History, cls: "text-muted-foreground" },
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
        const meta = ACTION_LABEL[e.action] ?? { label: e.action, icon: History, cls: "text-muted-foreground" };
        const Icon = meta.icon;
        const who = e.actor?.nome || e.actor?.email || "Utilizador";
        return (
          <li key={e.id} className="relative">
            <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
            <div className="flex items-center gap-2 text-sm">
              <Icon className={`h-3.5 w-3.5 ${meta.cls}`} />
              <span className="font-medium">{meta.label}</span>
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

type ItemWithObra = IntakeItem & { obra: { id: string; nome: string } | null };

function ItemRow({ item, onOpen }: { item: ItemWithObra; onOpen: () => void }) {
  const conf = Math.round((item.confidence ?? 0) * 100);
  const needsAttention = item.status === "pending_review" || item.status === "needs_more_info";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors px-4 py-3 flex items-center gap-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
            {TYPE_LABEL[item.item_type] ?? item.item_type}
          </Badge>
          <Badge
            variant={STATUS_VARIANT[item.status] ?? "outline"}
            className="text-[10px] py-0 px-1.5"
          >
            {STATUS_LABEL[item.status] ?? item.status}
          </Badge>
          {conf > 0 && (
            <span className="text-[11px] text-muted-foreground">{conf}%</span>
          )}
          {item.obra?.nome && (
            <span className="text-[11px] text-muted-foreground truncate">
              · {item.obra.nome}
            </span>
          )}
        </div>
        <p className="font-medium text-sm truncate">{item.title}</p>
      </div>
      {needsAttention && (
        <span className="hidden sm:inline text-xs text-muted-foreground">Rever</span>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

function ReviewDialog({
  item,
  open,
  onOpenChange,
}: {
  item: ItemWithObra | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const update = useUpdateIntakeStatus();
  const log = useLogIntakeAction();
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!open) setShowHistory(false);
  }, [open]);

  if (!item) return null;
  const conf = Math.round((item.confidence ?? 0) * 100);
  const url = targetUrl(item);

  const handleApprove = () => {
    update.mutate(
      { id: item.id, status: "approved", fromStatus: item.status },
      { onSuccess: () => onOpenChange(false) }
    );
  };
  const handleReject = () => {
    update.mutate(
      { id: item.id, status: "rejected", fromStatus: item.status },
      { onSuccess: () => onOpenChange(false) }
    );
  };
  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) log.mutate({ itemId: item.id, action: "opened" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="secondary">{TYPE_LABEL[item.item_type] ?? item.item_type}</Badge>
            <Badge variant={STATUS_VARIANT[item.status] ?? "outline"}>
              {STATUS_LABEL[item.status] ?? item.status}
            </Badge>
            {conf > 0 && (
              <span className="text-xs text-muted-foreground">{conf}% confiança</span>
            )}
          </div>
          <DialogTitle className="text-left">{item.title}</DialogTitle>
          {item.summary && (
            <DialogDescription className="text-left">{item.summary}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {item.obra?.nome && (
            <div className="text-xs text-muted-foreground">Obra: {item.obra.nome}</div>
          )}
          {item.missing_fields?.length > 0 && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
              <span className="font-medium">Em falta:</span> {item.missing_fields.join(", ")}
            </div>
          )}
          {item.axia_questions?.length > 0 && (
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs font-medium mb-1">Perguntas da Axia:</p>
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                {item.axia_questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 px-2 h-7 text-xs"
              onClick={toggleHistory}
            >
              <History className="h-3.5 w-3.5" />
              {showHistory ? "Ocultar histórico" : "Ver histórico"}
            </Button>
            {showHistory && <HistoryTimeline itemId={item.id} />}
          </div>
        </div>

        <DialogFooter className="flex-row flex-wrap gap-2 sm:justify-between">
          <div className="flex gap-2">
            {url && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() =>
                  log.mutate({ itemId: item.id, action: "opened", metadata: { target_url: url } })
                }
              >
                <Link to={url}>
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir
                </Link>
              </Button>
            )}
          </div>
          <div className="flex gap-2 ml-auto">
            {item.status !== "rejected" && (
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
            {item.status !== "approved" && item.status !== "converted" && (
              <Button
                size="sm"
                variant="default"
                className="gap-1"
                onClick={handleApprove}
                disabled={update.isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TABS = [
  { value: "all", label: "Todos", filter: () => true },
  { value: "pre_budget", label: "Pré-orçamentos", filter: (i: IntakeItem) => i.item_type === "pre_budget" },
  { value: "rdo", label: "RDOs", filter: (i: IntakeItem) => i.item_type === "rdo" },
  { value: "financial_record", label: "Financeiro", filter: (i: IntakeItem) => i.item_type === "financial_record" },
  { value: "no_obra", label: "Sem obra", filter: (i: IntakeItem) => !i.obra_id },
  { value: "low_conf", label: "Baixa confiança", filter: (i: IntakeItem) => (i.confidence ?? 0) < 0.7 },
];

export default function AxiaInboxPage() {
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<ItemWithObra | null>(null);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useIntakeItems();
  const items = data ?? [];
  const filtered = items.filter(TABS.find((t) => t.value === tab)?.filter ?? (() => true));
  const qc = useQueryClient();
  useAxiaIntakeRealtimeNotifications();

  useEffect(() => {
    const channel = supabase
      .channel("axia-intake-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "axia_intake_items" },
        () => {
          qc.invalidateQueries({ queryKey: ["axia-intake-items"] });
          qc.invalidateQueries({ queryKey: ["dashboard-alerts"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const handleOpen = (item: ItemWithObra) => {
    setSelected(item);
    setOpen(true);
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Caixa Axia</h1>
            <p className="text-sm text-muted-foreground">
              Itens criados por voz a aguardar revisão. Clique para rever cada item.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar...
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 flex flex-col items-center text-center text-muted-foreground rounded-2xl">
              <Inbox className="h-10 w-10 mb-2 opacity-50" />
              <p>Sem itens nesta categoria.</p>
            </Card>
          ) : (
            filtered.map((it) => (
              <ItemRow key={it.id} item={it} onOpen={() => handleOpen(it)} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <ReviewDialog item={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
