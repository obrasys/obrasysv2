import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Search,
  History,
  MoreVertical,
  Pencil,
  ExternalLink,
  Mic,
  ClipboardCheck,
  AlertTriangle,
  ShieldQuestion,
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
import { VoiceCommandButton } from "@/components/axia/VoiceCommandButton";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

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

const STATUS_BORDER: Record<string, string> = {
  pending_review: "border-l-4 border-l-amber-400",
  needs_more_info: "border-l-4 border-l-orange-500",
  approved: "border-l-4 border-l-emerald-500",
  converted: "border-l-4 border-l-primary",
  rejected: "border-l-4 border-l-muted-foreground/30 opacity-70",
};

const STATUS_BADGE: Record<string, string> = {
  pending_review: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  needs_more_info: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  approved: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  converted: "bg-primary/15 text-primary hover:bg-primary/15",
  rejected: "bg-muted text-muted-foreground hover:bg-muted",
};

const PRIMARY_CTA: Record<string, string> = {
  pending_review: "Rever",
  needs_more_info: "Completar dados",
  approved: "Abrir",
  converted: "Abrir entidade",
  rejected: "Ver detalhe",
};

const targetUrl = (it: IntakeItem) => {
  if (!it.target_entity_id) return null;
  switch (it.target_entity_type) {
    case "rdo":
      return `/rdos/${it.target_entity_id}`;
    case "financial_record":
      return `/financeiro`;
    case "pre_budget":
      return `/orcamentos`;
    default:
      return null;
  }
};

function formatExtractedMeta(item: IntakeItem): { label: string; value: string }[] {
  const data = (item.extracted_data ?? {}) as Record<string, any>;
  const out: { label: string; value: string }[] = [];

  if (item.item_type === "financial_record") {
    if (data.amount != null) {
      const cur = data.currency || "EUR";
      out.push({ label: "Valor", value: `${Number(data.amount).toFixed(2)} ${cur}` });
    }
    if (data.category) out.push({ label: "Categoria", value: String(data.category) });
    if (data.date) out.push({ label: "Data", value: String(data.date) });
  }
  if (item.item_type === "rdo") {
    if (data.date) out.push({ label: "Data RDO", value: String(data.date) });
    if (Array.isArray(data.activities) && data.activities.length)
      out.push({ label: "Atividades", value: `${data.activities.length}` });
  }
  if (item.item_type === "pre_budget") {
    if (data.area) out.push({ label: "Área", value: String(data.area) });
    if (Array.isArray(data.services) && data.services.length)
      out.push({ label: "Serviços", value: `${data.services.length}` });
  }
  if (item.item_type === "material_need" && Array.isArray(data.items)) {
    out.push({ label: "Itens", value: `${data.items.length}` });
  }
  return out;
}

function ItemCard({
  item,
  onOpenDetail,
}: {
  item: IntakeItemWithObra;
  onOpenDetail: () => void;
}) {
  const update = useUpdateIntakeStatus();
  const conf = Math.round((item.confidence ?? 0) * 100);
  const url = targetUrl(item);
  const meta = formatExtractedMeta(item);
  const isFinal = item.status === "approved" || item.status === "converted";
  const isRejected = item.status === "rejected";

  const handlePrimary = () => {
    if (isFinal && url) return; // Link handles
    onOpenDetail();
  };

  return (
    <Card
      className={cn(
        "rounded-xl hover:shadow-md transition-shadow flex flex-col",
        STATUS_BORDER[item.status] ?? ""
      )}
    >
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        {/* Top line: type / status / confidence / date */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
              {TYPE_LABEL[item.item_type] ?? item.item_type}
            </Badge>
            <Badge
              className={cn("text-[10px] py-0 px-1.5 border-0", STATUS_BADGE[item.status])}
            >
              {STATUS_LABEL[item.status] ?? item.status}
            </Badge>
            {conf > 0 && (
              <span
                className={cn(
                  "text-[10px] font-medium",
                  conf >= 85
                    ? "text-emerald-600"
                    : conf >= 70
                      ? "text-amber-600"
                      : "text-destructive"
                )}
              >
                {conf}%
              </span>
            )}
          </div>
          <span
            className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0"
            title={new Date(item.created_at).toLocaleString("pt-PT")}
          >
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(item.created_at), {
              addSuffix: true,
              locale: pt,
            })}
          </span>
        </div>

        {/* Title + summary */}
        <div className="min-w-0">
          <h4 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground">
            {item.title}
          </h4>
          {item.summary && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {item.summary}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 gap-1 text-[11px] text-muted-foreground">
          {item.obra?.nome ? (
            <span className="flex items-center gap-1.5 truncate">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{item.obra.nome}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-orange-600">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              Sem obra associada
            </span>
          )}
          <span className="flex items-center gap-1.5 truncate">
            <Mic className="h-3 w-3 flex-shrink-0" />
            Origem: Comando de voz
          </span>
          {meta.slice(0, 2).map((m) => (
            <span key={m.label} className="truncate">
              <span className="font-medium text-foreground/70">{m.label}:</span>{" "}
              {m.value}
            </span>
          ))}
          {item.missing_fields?.length > 0 && (
            <span className="text-orange-600 truncate">
              Em falta: {item.missing_fields.join(", ")}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-2 mt-auto border-t border-border/60">
          {isFinal && url ? (
            <Button
              asChild
              size="sm"
              variant="default"
              className="gap-1 h-8 px-2.5 text-xs flex-1"
            >
              <Link to={url}>
                <ExternalLink className="h-3.5 w-3.5" /> {PRIMARY_CTA[item.status]}
              </Link>
            </Button>
          ) : !isRejected ? (
            <Button
              size="sm"
              variant="default"
              className="gap-1 h-8 px-2.5 text-xs flex-1"
              onClick={handlePrimary}
            >
              <Eye className="h-3.5 w-3.5" /> {PRIMARY_CTA[item.status] ?? "Rever"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 h-8 px-2.5 text-xs flex-1"
              onClick={onOpenDetail}
            >
              <Eye className="h-3.5 w-3.5" /> Ver detalhe
            </Button>
          )}

          {item.status === "pending_review" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-8 px-2.5 text-xs"
              onClick={() =>
                update.mutate({
                  id: item.id,
                  status: "approved",
                  fromStatus: item.status,
                })
              }
              disabled={update.isPending}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onOpenDetail}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
              </DropdownMenuItem>
              {item.status !== "rejected" && (
                <DropdownMenuItem
                  onClick={() =>
                    update.mutate({
                      id: item.id,
                      status: "rejected",
                      fromStatus: item.status,
                    })
                  }
                  className="text-destructive focus:text-destructive"
                >
                  <XCircle className="h-3.5 w-3.5 mr-2" /> Rejeitar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onOpenDetail}>
                <Mic className="h-3.5 w-3.5 mr-2" /> Ver comando original
              </DropdownMenuItem>
              {url && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={url}>
                      <ExternalLink className="h-3.5 w-3.5 mr-2" /> Abrir entidade
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

const TAB_DEFS: { value: string; label: string; filter: (i: IntakeItem) => boolean }[] = [
  { value: "all", label: "Todos", filter: () => true },
  { value: "pre_budget", label: "Pré-orçamentos", filter: (i) => i.item_type === "pre_budget" },
  { value: "rdo", label: "RDOs", filter: (i) => i.item_type === "rdo" },
  { value: "financial_record", label: "Financeiro", filter: (i) => i.item_type === "financial_record" },
  { value: "no_obra", label: "Sem obra", filter: (i) => !i.obra_id },
  { value: "low_conf", label: "Baixa confiança", filter: (i) => (i.confidence ?? 0) < 0.7 },
];

const STATUS_FILTERS = [
  { value: "all", label: "Todos os estados" },
  { value: "pending_review", label: "Pendente" },
  { value: "needs_more_info", label: "Precisa de informação" },
  { value: "approved", label: "Aprovado" },
  { value: "converted", label: "Convertido" },
  { value: "rejected", label: "Rejeitado" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Mais recentes" },
  { value: "conf_desc", label: "Maior confiança" },
  { value: "conf_asc", label: "Menor confiança" },
  { value: "priority", label: "Prioridade" },
];

const PRIORITY_RANK: Record<string, number> = {
  pending_review: 0,
  needs_more_info: 1,
  approved: 2,
  converted: 3,
  rejected: 4,
};

export default function AxiaInboxPage() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selected, setSelected] = useState<IntakeItemWithObra | null>(null);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useIntakeItems();
  const items = (data ?? []) as IntakeItemWithObra[];
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

  // KPIs
  const kpis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      pending: items.filter((i) => i.status === "pending_review").length,
      noObra: items.filter(
        (i) => !i.obra_id || i.status === "needs_more_info"
      ).length,
      lowConf: items.filter((i) => (i.confidence ?? 0) < 0.7).length,
      approvedToday: items.filter(
        (i) =>
          (i.status === "approved" || i.status === "converted") &&
          new Date(i.created_at) >= today
      ).length,
    };
  }, [items]);

  // Tab counters
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of TAB_DEFS) counts[t.value] = items.filter(t.filter).length;
    return counts;
  }, [items]);

  // Apply tab + filters + search + sort
  const filtered = useMemo(() => {
    const tabFilter = TAB_DEFS.find((t) => t.value === tab)?.filter ?? (() => true);
    const q = search.trim().toLowerCase();
    let list = items.filter((i) => {
      if (!tabFilter(i)) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (q) {
        const hay = [
          i.title,
          i.summary,
          i.obra?.nome,
          TYPE_LABEL[i.item_type],
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "conf_desc":
          return (b.confidence ?? 0) - (a.confidence ?? 0);
        case "conf_asc":
          return (a.confidence ?? 0) - (b.confidence ?? 0);
        case "priority":
          return (PRIORITY_RANK[a.status] ?? 99) - (PRIORITY_RANK[b.status] ?? 99);
        case "recent":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return list;
  }, [items, tab, statusFilter, search, sortBy]);

  const handleOpen = (item: IntakeItemWithObra) => {
    setSelected(item);
    setOpen(true);
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Caixa Axia</h1>
            <p className="text-sm text-muted-foreground">
              Revise os dados criados por voz antes de finalizar no Obra Sys.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/axia/inbox?historico=1">
              <History className="h-4 w-4" /> Ver histórico
            </Link>
          </Button>
          <VoiceCommandButton label="Novo comando Axia" size="sm" />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          title="Pendentes"
          value={kpis.pending}
          icon={ClipboardCheck}
          description="Aguardam revisão"
          iconClassName="bg-amber-100 [&_svg]:text-amber-600"
        />
        <KpiCard
          title="Sem obra"
          value={kpis.noObra}
          icon={AlertTriangle}
          description="Precisam de associação"
          iconClassName="bg-orange-100 [&_svg]:text-orange-600"
        />
        <KpiCard
          title="Baixa confiança"
          value={kpis.lowConf}
          icon={ShieldQuestion}
          description="Requerem validação"
          iconClassName="bg-red-100 [&_svg]:text-red-600"
        />
        <KpiCard
          title="Aprovados hoje"
          value={kpis.approvedToday}
          icon={CheckCircle2}
          description="Convertidos ou aceites"
          iconClassName="bg-emerald-100 [&_svg]:text-emerald-600"
        />
      </div>

      {/* Tabs with counters */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="h-auto p-1 bg-muted/60 inline-flex">
            {TAB_DEFS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {t.label}
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px] bg-background/80"
                >
                  {tabCounts[t.value] ?? 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Filter bar */}
        <Card className="mt-3 rounded-xl">
          <CardContent className="p-3 flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por obra, descrição ou tipo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full md:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-full md:w-48">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar...
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 rounded-2xl">
              <div className="flex flex-col items-center text-center text-muted-foreground gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Inbox className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    Sem pendências da Axia
                  </p>
                  <p className="text-sm mt-1 max-w-md">
                    Quando criar pré-orçamentos, RDOs ou registos financeiros
                    por voz, eles aparecerão aqui para revisão.
                  </p>
                </div>
                <VoiceCommandButton label="Novo comando Axia" size="sm" />
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((it) => (
                <ItemCard
                  key={it.id}
                  item={it}
                  onOpenDetail={() => handleOpen(it)}
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
