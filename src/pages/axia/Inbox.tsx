import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox, CheckCircle2, XCircle, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useIntakeItems, useUpdateIntakeStatus, type IntakeItem } from "@/hooks/useAxiaVoiceIntake";
import { Link } from "react-router-dom";

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

const targetUrl = (it: IntakeItem) => {
  if (!it.target_entity_id) return null;
  switch (it.target_entity_type) {
    case "rdo":
      return `/rdos/${it.target_entity_id}`;
    case "financial_record":
      return `/financeiro`;
    case "pre_budget":
      return `/axia/inbox`; // editor dedicado próximo passo
    default:
      return null;
  }
};

function ItemCard({ item }: { item: IntakeItem & { obra: { id: string; nome: string } | null } }) {
  const update = useUpdateIntakeStatus();
  const url = targetUrl(item);
  const conf = Math.round((item.confidence ?? 0) * 100);

  return (
    <Card className="p-4 rounded-2xl space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary">{TYPE_LABEL[item.item_type] ?? item.item_type}</Badge>
            <Badge variant="outline">{STATUS_LABEL[item.status] ?? item.status}</Badge>
            {conf > 0 && <span className="text-xs text-muted-foreground">{conf}% confiança</span>}
          </div>
          <h4 className="font-medium truncate">{item.title}</h4>
          {item.summary && <p className="text-sm text-muted-foreground line-clamp-2">{item.summary}</p>}
          {item.obra?.nome && (
            <p className="text-xs text-muted-foreground mt-1">Obra: {item.obra.nome}</p>
          )}
          {item.missing_fields?.length > 0 && (
            <p className="text-xs text-yellow-600 mt-1">
              Em falta: {item.missing_fields.join(", ")}
            </p>
          )}
          {item.axia_questions?.length > 0 && (
            <ul className="text-xs text-muted-foreground mt-1 list-disc pl-4">
              {item.axia_questions.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {url && (
          <Button asChild size="sm" variant="outline" className="gap-1">
            <Link to={url}><ExternalLink className="h-3.5 w-3.5" /> Abrir</Link>
          </Button>
        )}
        {item.status !== "approved" && item.status !== "converted" && (
          <Button
            size="sm"
            variant="default"
            className="gap-1"
            onClick={() => update.mutate({ id: item.id, status: "approved" })}
            disabled={update.isPending}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
          </Button>
        )}
        {item.status !== "rejected" && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-destructive"
            onClick={() => update.mutate({ id: item.id, status: "rejected" })}
            disabled={update.isPending}
          >
            <XCircle className="h-3.5 w-3.5" /> Rejeitar
          </Button>
        )}
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
  const { data, isLoading } = useIntakeItems();
  const items = data ?? [];
  const filtered = items.filter(TABS.find((t) => t.value === tab)?.filter ?? (() => true));
  const qc = useQueryClient();

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

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Caixa Axia</h1>
            <p className="text-sm text-muted-foreground">Itens criados por voz a aguardar revisão.</p>
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
        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> A carregar...</div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 flex flex-col items-center text-center text-muted-foreground rounded-2xl">
              <Inbox className="h-10 w-10 mb-2 opacity-50" />
              <p>Sem itens nesta categoria.</p>
            </Card>
          ) : (
            filtered.map((it) => <ItemCard key={it.id} item={it} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
