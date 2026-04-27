import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Inbox,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Eye,
  Building2,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  useIntakeItems,
  useUpdateIntakeStatus,
  type IntakeItem,
} from "@/hooks/useAxiaVoiceIntake";
import { useAxiaIntakeRealtimeNotifications } from "@/hooks/useAxiaIntakeRealtimeNotifications";
import {
  AxiaIntakeReviewDialog,
  type IntakeItemWithObra,
} from "@/components/axia/AxiaIntakeReviewDialog";
import { formatDistanceToNow } from "date-fns";
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

function ItemCard({
  item,
  onOpenDetail,
}: {
  item: IntakeItemWithObra;
  onOpenDetail: () => void;
}) {
  const update = useUpdateIntakeStatus();
  const conf = Math.round((item.confidence ?? 0) * 100);
  const canApprove = item.status !== "approved" && item.status !== "converted";
  const canReject = item.status !== "rejected";

  return (
    <Card className="rounded-xl p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
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
            <span className="text-[10px] text-muted-foreground">{conf}%</span>
          )}
        </div>
        <span
          className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0"
          title={new Date(item.created_at).toLocaleString("pt-PT")}
        >
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: pt })}
        </span>
      </div>

      <div className="min-w-0">
        <h4 className="font-medium text-sm leading-snug line-clamp-2">{item.title}</h4>
        {item.summary && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
        )}
      </div>

      <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
        {item.obra?.nome ? (
          <span className="flex items-center gap-1 truncate">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{item.obra.nome}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-yellow-700">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            Sem obra associada
          </span>
        )}
        {item.missing_fields?.length > 0 && (
          <span className="text-yellow-700 truncate">
            Em falta: {item.missing_fields.join(", ")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 pt-2 border-t border-border/60">
        {canApprove && (
          <Button
            size="sm"
            variant="default"
            className="gap-1 h-7 px-2 text-xs flex-1"
            onClick={() =>
              update.mutate({ id: item.id, status: "approved", fromStatus: item.status })
            }
            disabled={update.isPending}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
          </Button>
        )}
        {canReject && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 h-7 px-2 text-xs text-destructive"
            onClick={() =>
              update.mutate({ id: item.id, status: "rejected", fromStatus: item.status })
            }
            disabled={update.isPending}
          >
            <XCircle className="h-3.5 w-3.5" /> Rejeitar
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="gap-1 h-7 px-2 text-xs ml-auto"
          onClick={onOpenDetail}
        >
          <Eye className="h-3.5 w-3.5" /> Detalhe
        </Button>
      </div>
    </Card>
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
  const [selected, setSelected] = useState<IntakeItemWithObra | null>(null);
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

  const handleOpen = (item: IntakeItemWithObra) => {
    setSelected(item);
    setOpen(true);
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Caixa Axia</h1>
            <p className="text-sm text-muted-foreground">
              Itens criados por voz a aguardar revisão.
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
        <TabsContent value={tab} className="mt-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((it) => (
                <ItemCard
                  key={it.id}
                  item={it as IntakeItemWithObra}
                  onOpenDetail={() => handleOpen(it as IntakeItemWithObra)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AxiaIntakeReviewDialog item={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
