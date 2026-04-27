import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox, Loader2, Sparkles, ChevronRight } from "lucide-react";
import { useIntakeItems, type IntakeItem } from "@/hooks/useAxiaVoiceIntake";
import { useAxiaIntakeRealtimeNotifications } from "@/hooks/useAxiaIntakeRealtimeNotifications";
import {
  AxiaIntakeReviewDialog,
  type IntakeItemWithObra,
} from "@/components/axia/AxiaIntakeReviewDialog";

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

function ItemRow({ item, onOpen }: { item: IntakeItemWithObra; onOpen: () => void }) {
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
          {conf > 0 && <span className="text-[11px] text-muted-foreground">{conf}%</span>}
          {item.obra?.nome && (
            <span className="text-[11px] text-muted-foreground truncate">· {item.obra.nome}</span>
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
              <ItemRow key={it.id} item={it as IntakeItemWithObra} onOpen={() => handleOpen(it as IntakeItemWithObra)} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <AxiaIntakeReviewDialog item={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
