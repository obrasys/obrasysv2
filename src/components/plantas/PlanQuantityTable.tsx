import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Layers,
  Search,
  Ruler,
  SquareDashed,
  Plug,
  Loader2,
  Download,
  ListChecks,
  Footprints,
  Package,
} from "lucide-react";
import {
  usePlanQuantitativos,
  type PlanQuantitativoRow,
  type QuantitativoSource,
} from "@/hooks/usePlanQuantitativos";
import { usePlanFloors } from "@/hooks/usePlanFloors";
import {
  ConfidenceBadge,
  CONFIDENCE_OPTIONS,
  type ConfidenceLevel,
} from "@/components/plantas/ConfidenceBadge";
import { PlanBudgetSendDialog } from "@/components/plantas/PlanBudgetSendDialog";
import { cn } from "@/lib/utils";

const SOURCE_META: Record<
  QuantitativoSource,
  { label: string; icon: typeof Ruler; tone: string }
> = {
  medicao: { label: "Medição", icon: Ruler, tone: "text-blue-600" },
  compartimento: { label: "Compartimento", icon: SquareDashed, tone: "text-emerald-600" },
  especialidade: { label: "Especialidade", icon: Plug, tone: "text-sky-600" },
  escada: { label: "Escada", icon: Footprints, tone: "text-red-600" },
  outros: { label: "Outros", icon: Package, tone: "text-slate-600" },
};

interface PlanQuantityTableProps {
  planImportId?: string;
  obraId?: string;
  /** Optional callback when the user wants to send selection to budget */
  onSendToBudget?: (rows: PlanQuantitativoRow[]) => void;
}

export function PlanQuantityTable({
  planImportId,
  obraId,
  onSendToBudget,
}: PlanQuantityTableProps) {
  const { rows, isLoading } = usePlanQuantitativos({ planImportId, obraId });
  const { floors } = usePlanFloors(obraId);

  const [search, setSearch] = useState("");
  const [floorFilter, setFloorFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<QuantitativoSource | "all">("all");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendOpen, setSendOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (confidenceFilter !== "all" && r.confidence !== confidenceFilter) return false;
      if (floorFilter === "__none__" && r.floor_id) return false;
      if (floorFilter !== "all" && floorFilter !== "__none__" && r.floor_id !== floorFilter) return false;
      if (term) {
        const hay = `${r.descricao} ${r.categoria} ${r.camada}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rows, search, floorFilter, sourceFilter, confidenceFilter]);

  const totals = useMemo(() => {
    const byUnit: Record<string, number> = {};
    for (const r of filtered) byUnit[r.unidade] = (byUnit[r.unidade] || 0) + Number(r.valor || 0);
    return byUnit;
  }, [filtered]);

  const counts = useMemo(() => {
    return {
      all: rows.length,
      medicao: rows.filter((r) => r.source === "medicao").length,
      compartimento: rows.filter((r) => r.source === "compartimento").length,
      especialidade: rows.filter((r) => r.source === "especialidade").length,
      escada: rows.filter((r) => r.source === "escada").length,
      outros: rows.filter((r) => r.source === "outros").length,
    };
  }, [rows]);

  const floorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of floors) m.set(f.id, f.name);
    return m;
  }, [floors]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected);
      filtered.forEach((r) => next.delete(r.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((r) => next.add(r.id));
      setSelected(next);
    }
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const exportCsv = () => {
    const headers = [
      "Tipo",
      "Descrição",
      "Categoria",
      "Camada",
      "Valor",
      "Unidade",
      "Confiança",
      "Origem",
      "Pavimento",
    ];
    const lines = [headers.join(";")];
    for (const r of filtered) {
      lines.push(
        [
          SOURCE_META[r.source]?.label ?? r.source,
          (r.descricao || "").replace(/;/g, ","),
          r.categoria,
          r.camada,
          Number(r.valor).toFixed(2).replace(".", ","),
          r.unidade,
          r.confidence,
          r.origem,
          r.floor_id ? floorMap.get(r.floor_id) ?? "" : "Sem pavimento",
        ].join(";"),
      );
    }
    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quantitativos-planta.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="rounded-xl">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Tabela Unificada de Quantitativos</h2>
            <Badge variant="secondary" className="text-[10px]">
              {filtered.length} de {rows.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} type="button">
              <Download className="h-3.5 w-3.5 mr-1" /> Exportar CSV
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const sel = filtered.filter((r) => selected.has(r.id));
                if (onSendToBudget) onSendToBudget(sel);
                else setSendOpen(true);
              }}
              disabled={selected.size === 0}
              type="button"
            >
              <ListChecks className="h-3.5 w-3.5 mr-1" />
              Enviar p/ orçamento ({selected.size})
            </Button>
          </div>
        </div>

        {/* Source tabs */}
        <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
          <TabsList className="flex w-full overflow-x-auto justify-start">
            <TabsTrigger value="all" className="text-xs">
              Todos <Badge variant="secondary" className="ml-1 text-[9px]">{counts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="medicao" className="text-xs">
              Medições <Badge variant="secondary" className="ml-1 text-[9px]">{counts.medicao}</Badge>
            </TabsTrigger>
            <TabsTrigger value="compartimento" className="text-xs">
              Comp. <Badge variant="secondary" className="ml-1 text-[9px]">{counts.compartimento}</Badge>
            </TabsTrigger>
            <TabsTrigger value="especialidade" className="text-xs">
              Especialidades <Badge variant="secondary" className="ml-1 text-[9px]">{counts.especialidade}</Badge>
            </TabsTrigger>
            <TabsTrigger value="escada" className="text-xs">
              Escadas <Badge variant="secondary" className="ml-1 text-[9px]">{counts.escada}</Badge>
            </TabsTrigger>
            <TabsTrigger value="outros" className="text-xs">
              Outros <Badge variant="secondary" className="ml-1 text-[9px]">{counts.outros}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Procurar descrição, categoria…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={floorFilter} onValueChange={setFloorFilter}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue placeholder="Pavimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pavimentos</SelectItem>
              <SelectItem value="__none__">Sem pavimento</SelectItem>
              {floors.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={confidenceFilter} onValueChange={(v) => setConfidenceFilter(v as any)}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue placeholder="Confiança" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as confianças</SelectItem>
              {CONFIDENCE_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Totals strip */}
        {Object.keys(totals).length > 0 && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground">Totais:</span>
            {Object.entries(totals).map(([unit, sum]) => (
              <span key={unit} className="font-mono">
                {sum.toFixed(2)} {unit}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="max-h-[60vh] overflow-auto">
        {isLoading ? (
          <div className="p-10 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A carregar quantitativos…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Sem quantitativos para os filtros atuais.
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Selecionar todos"
                    className="cursor-pointer"
                  />
                </TableHead>
                <TableHead className="w-[110px]">Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[120px]">Camada</TableHead>
                <TableHead className="w-[120px]">Pavimento</TableHead>
                <TableHead className="w-[110px] text-right">Valor</TableHead>
                <TableHead className="w-[150px]">Confiança</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const meta = SOURCE_META[r.source];
                const Icon = meta?.icon ?? Ruler;
                const isSelected = selected.has(r.id);
                return (
                  <TableRow
                    key={`${r.source}-${r.id}-${r.camada}`}
                    className={cn(isSelected && "bg-primary/5")}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(r.id)}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1 text-xs", meta?.tone)}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta?.label ?? r.source}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {r.descricao}
                      {r.action_type && (
                        <Badge variant="outline" className="ml-2 text-[9px] h-4 px-1">
                          {r.action_type}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.camada}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.floor_id ? (
                        floorMap.get(r.floor_id) ?? <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="text-muted-foreground italic">Sem pavimento</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {Number(r.valor).toFixed(2)} <span className="text-muted-foreground">{r.unidade}</span>
                    </TableCell>
                    <TableCell>
                      <ConfidenceBadge level={r.confidence} origin={r.origem} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {obraId && !onSendToBudget && (
        <PlanBudgetSendDialog
          open={sendOpen}
          onOpenChange={setSendOpen}
          rows={filtered.filter((r) => selected.has(r.id))}
          obraId={obraId}
          floorMap={floorMap}
          planImportId={planImportId}
        />
      )}
    </Card>
  );
}
