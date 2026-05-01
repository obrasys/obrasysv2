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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Layers, Table2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlanAnalysisResult } from "./PlanAIAnalysis";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Map of pageNumber -> analysis result (only analyzed pages). */
  resultsByPage: Record<number, PlanAnalysisResult>;
  obraId: string;
  /** Plan import id — required to attach quantitativos to the source plan. */
  planImportId: string;
  planName?: string;
}

type SectionKey = "dimensions" | "rooms" | "elements";

const SECTION_LABEL: Record<SectionKey, string> = {
  dimensions: "Cotas",
  rooms: "Compartimentos",
  elements: "Elementos",
};

const confidenceFromScore = (score?: number): "confirmado" | "provavel" | "incerto" => {
  if (typeof score !== "number") return "provavel";
  if (score >= 0.85) return "confirmado";
  if (score >= 0.55) return "provavel";
  return "incerto";
};

export function PlanAxiaBudgetSendDialog({
  open,
  onOpenChange,
  resultsByPage,
  obraId,
  planImportId,
  planName,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const pages = useMemo(
    () =>
      Object.keys(resultsByPage)
        .map(Number)
        .sort((a, b) => a - b),
    [resultsByPage],
  );

  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set(pages));
  const [includeSections, setIncludeSections] = useState<Record<SectionKey, boolean>>({
    dimensions: true,
    rooms: true,
    elements: true,
  });
  const [excludeReviewRequired, setExcludeReviewRequired] = useState(true);
  const [sending, setSending] = useState(false);

  // Recompute when pages change (e.g. dialog re-opened)
  useMemo(() => {
    setSelectedPages((prev) => {
      if (prev.size === 0) return new Set(pages);
      const next = new Set<number>();
      pages.forEach((p) => prev.has(p) && next.add(p));
      return next.size === 0 ? new Set(pages) : next;
    });
  }, [pages]);

  const togglePage = (p: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const toggleSection = (k: SectionKey) => {
    setIncludeSections((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  // Map Axia normalized room types → plan_rooms.tipo_compartimento taxonomy.
  // Anything not mapped falls back to "habitacao".
  const ROOM_TYPE_MAP: Record<string, string> = {
    sala: "habitacao",
    cozinha: "habitacao",
    sala_cozinha: "habitacao",
    quarto: "habitacao",
    suite: "habitacao",
    instalacao_sanitaria: "wc",
    circulacao: "circulacao",
    escada: "circulacao",
    arrumos: "arrumos",
    zona_tecnica: "tecnico",
    garagem: "garagem",
    estacionamento: "garagem",
    terraco: "exterior",
    varanda: "exterior",
    jardim: "exterior",
    churrasqueira: "exterior",
    exterior: "exterior",
    indefinido: "habitacao",
  };

  const isReview = (item: any) => excludeReviewRequired && item?.review_required === true;

  const preview = useMemo(() => {
    const perPage: Array<{ page: number; counts: Record<SectionKey, number>; total: number; filtered: number }> = [];
    let totalAll = 0;
    let filteredAll = 0;
    for (const page of pages) {
      if (!selectedPages.has(page)) continue;
      const r = resultsByPage[page];

      // Cotas ilegíveis nunca contam (não são honestas).
      const dims = (r.dimensions ?? []).filter((d: any) => !d.valor_nao_legivel);
      const dimsKept = includeSections.dimensions ? dims.filter((d) => !isReview(d)) : [];
      const dimsFiltered = (includeSections.dimensions ? dims.length : 0) - dimsKept.length;

      const rmsKept = includeSections.rooms ? (r.rooms ?? []).filter((rm) => !isReview(rm)) : [];
      const rmsFiltered = (includeSections.rooms ? (r.rooms?.length ?? 0) : 0) - rmsKept.length;

      const elsKept = includeSections.elements ? (r.elements ?? []).filter((e) => !isReview(e)) : [];
      const elsFiltered = (includeSections.elements ? (r.elements?.length ?? 0) : 0) - elsKept.length;

      const counts: Record<SectionKey, number> = {
        dimensions: dimsKept.length,
        rooms: rmsKept.length,
        elements: elsKept.length,
      };
      const total = counts.dimensions + counts.rooms + counts.elements;
      const filtered = dimsFiltered + rmsFiltered + elsFiltered;
      filteredAll += filtered;
      if (total === 0 && filtered === 0) continue;
      perPage.push({ page, counts, total, filtered });
      totalAll += total;
    }
    return { perPage, totalAll, filteredAll };
  }, [pages, selectedPages, resultsByPage, includeSections, excludeReviewRequired]);

  const handleSend = async () => {
    if (!user?.id) {
      toast.error("Sessão inválida");
      return;
    }
    if (preview.totalAll === 0) {
      toast.error("Sem itens para enviar com os filtros atuais");
      return;
    }

    setSending(true);
    try {
      const measurementsRows: any[] = [];
      const roomsRows: any[] = [];
      const elementsRows: any[] = [];

      for (const page of pages) {
        if (!selectedPages.has(page)) continue;
        const r = resultsByPage[page];
        const folhaTag = `Folha ${page}`;

        // Cotas → plan_measurements (skip ilegíveis e review se filtro ligado)
        if (includeSections.dimensions && r.dimensions?.length) {
          r.dimensions.forEach((d: any) => {
            if (d.valor_nao_legivel) return;
            if (isReview(d)) return;
            const valor = Number(d.value) || 0;
            measurementsRows.push({
              plan_import_id: planImportId,
              user_id: user.id,
              tipo: "cota",
              coordinates: [
                { x: Number(d.position_x) || 0, y: Number(d.position_y) || 0 },
              ],
              valor_bruto: valor,
              unidade: (d.unit || "m").toLowerCase(),
              etiqueta: d.label || `Cota ${valor} ${d.unit ?? ""}`.trim(),
              camada: folhaTag,
              cor: "#3b82f6",
              estado_validacao: "pendente",
              confidence: confidenceFromScore(d.confidence),
              measurement_origin: "axia",
            });
          });
        }

        // Compartimentos → plan_rooms (mapeia tipo_normalizado)
        if (includeSections.rooms && r.rooms?.length) {
          r.rooms.forEach((rm: any) => {
            if (isReview(rm)) return;
            const tipo = ROOM_TYPE_MAP[rm.tipo_normalizado ?? ""] ?? "habitacao";
            roomsRows.push({
              plan_import_id: planImportId,
              user_id: user.id,
              nome: rm.name || "Compartimento",
              tipo_compartimento: tipo,
              boundary_coords: [
                { x: Number(rm.center_x) || 0, y: Number(rm.center_y) || 0 },
              ],
              area_m2: Number(rm.estimated_area) || 0,
              perimetro_m: 0,
              observacao: folhaTag,
              estado_validacao: "pendente",
              origem: "axia",
              confidence: confidenceFromScore(rm.confidence),
            });
          });
        }

        // Elementos → plan_placed_elements
        if (includeSections.elements && r.elements?.length) {
          r.elements.forEach((e: any) => {
            if (isReview(e)) return;
            const qty = Number(e.count) || 1;
            elementsRows.push({
              plan_import_id: planImportId,
              user_id: user.id,
              symbol_type_id: e.label || e.type || "elemento",
              category: "instalacoes",
              subcategory: e.type || "geral",
              x: Number(e.position_x) || 0,
              y: Number(e.position_y) || 0,
              quantity: qty,
              note: folhaTag,
            });
          });
        }
      }

      let inserted = 0;
      if (measurementsRows.length) {
        const { error } = await supabase.from("plan_measurements").insert(measurementsRows);
        if (error) throw error;
        inserted += measurementsRows.length;
      }
      if (roomsRows.length) {
        const { error } = await supabase.from("plan_rooms").insert(roomsRows);
        if (error) throw error;
        inserted += roomsRows.length;
      }
      if (elementsRows.length) {
        const { error } = await supabase.from("plan_placed_elements").insert(elementsRows);
        if (error) throw error;
        inserted += elementsRows.length;
      }

      toast.success(
        `${inserted} quantitativo(s) adicionados à Tabela Unificada`,
        {
          action: {
            label: "Ver Quantitativos",
            onClick: () =>
              navigate(`/obras/${obraId}/plantas/${planImportId}/quantitativos`),
          },
        },
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
            <Table2 className="h-4 w-4 text-primary" />
            Enviar análise Axia™ para Tabela Unificada de Quantitativos
          </DialogTitle>
          <DialogDescription>
            A Axia regista cotas, compartimentos e elementos identificados como
            quantitativos pendentes em <strong>Orçamentar → Ver Quantitativos</strong>.
            Cada item fica associado à respetiva folha do PDF.
            {planName ? <> Planta: <strong>{planName}</strong>.</> : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sections */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">
              Categorias a incluir
            </div>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(SECTION_LABEL) as SectionKey[]).map((k) => (
                <label
                  key={k}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={includeSections[k]}
                    onCheckedChange={() => toggleSection(k)}
                  />
                  <span className="text-sm">{SECTION_LABEL[k]}</span>
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer hover:bg-muted/40 mt-2 w-fit">
              <Checkbox
                checked={excludeReviewRequired}
                onCheckedChange={(v) => setExcludeReviewRequired(!!v)}
              />
              <span className="text-xs">Excluir itens marcados para validação humana</span>
            </label>
          </div>

          {/* Pages */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Folhas analisadas</span>
              <Badge variant="secondary">{pages.length}</Badge>
            </div>
            <ScrollArea className="h-[200px] rounded-md border p-2">
              <div className="space-y-1">
                {pages.map((p) => {
                  const row = preview.perPage.find((x) => x.page === p);
                  return (
                    <label
                      key={p}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-muted/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedPages.has(p)}
                          onCheckedChange={() => togglePage(p)}
                        />
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">Folha {p}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {row?.total ?? 0} item(s)
                      </Badge>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Summary */}
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total a enviar</span>
              <span className="font-semibold">{preview.totalAll} item(s)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Folhas selecionadas</span>
              <span className="font-semibold">{preview.perPage.length}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending || preview.totalAll === 0}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A enviar…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" /> Enviar para Quantitativos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
