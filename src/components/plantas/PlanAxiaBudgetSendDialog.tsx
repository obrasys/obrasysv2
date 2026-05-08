import { useEffect, useMemo, useState } from "react";
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
import { buildBudgetableQuantities } from "@/lib/plan-quantitativos-engine";

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

type DerivedKey = "openings" | "baseboards" | "wallSurfaces" | "rooms";

const DERIVED_LABEL: Record<DerivedKey, string> = {
  openings: "Vãos por dimensão (un)",
  baseboards: "Rodapé — perímetro útil (m)",
  wallSurfaces: "Paredes — m² para revestir/pintar",
  rooms: "Pavimento e Teto (m²)",
};

const confidenceFromScore = (score?: number): "confirmado" | "provavel" | "incerto" => {
  if (typeof score !== "number") return "provavel";
  if (score >= 0.85) return "confirmado";
  if (score >= 0.55) return "provavel";
  return "incerto";
};

// Map Axia normalized room types → plan_rooms.tipo_compartimento taxonomy.
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
  const [includeDerived, setIncludeDerived] = useState<Record<DerivedKey, boolean>>({
    openings: true,
    baseboards: true,
    wallSurfaces: true,
    rooms: true,
  });
  const [excludeReviewRequired, setExcludeReviewRequired] = useState(false);
  const [replacePrevious, setReplacePrevious] = useState(true);
  const [sending, setSending] = useState(false);

  // Recompute when pages change (e.g. dialog re-opened) — useEffect, não useMemo
  useEffect(() => {
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

  const toggleDerived = (k: DerivedKey) => {
    setIncludeDerived((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  // Pre-compute derived quantities per selected page
  const perPage = useMemo(() => {
    return pages
      .filter((p) => selectedPages.has(p))
      .map((page) => {
        const r = resultsByPage[page];
        const q = buildBudgetableQuantities(r as any, { groupOpeningsByDim: true });
        return { page, quantities: q, raw: r };
      });
  }, [pages, selectedPages, resultsByPage]);

  const preview = useMemo(() => {
    let rooms = 0,
      baseboards = 0,
      walls = 0,
      openings = 0;
    for (const { quantities } of perPage) {
      if (includeDerived.rooms) rooms += quantities.rooms.length * 2; // pavimento + teto
      if (includeDerived.baseboards) baseboards += quantities.baseboards.filter((b) => b.valor > 0).length;
      if (includeDerived.wallSurfaces) walls += quantities.wallSurfaces.filter((w) => w.valor > 0).length;
      if (includeDerived.openings) openings += quantities.openingsByDim.length;
    }
    return {
      rooms,
      baseboards,
      walls,
      openings,
      total: rooms + baseboards + walls + openings,
    };
  }, [perPage, includeDerived]);

  const handleSend = async () => {
    if (!user?.id) {
      toast.error("Sessão inválida");
      return;
    }
    if (preview.total === 0) {
      toast.error("Sem itens para enviar com os filtros atuais");
      return;
    }

    setSending(true);
    try {
      const measurementsRows: any[] = [];
      const roomsRows: any[] = [];
      const elementsRows: any[] = [];

      for (const { page, quantities, raw } of perPage) {
        const folhaTag = `Folha ${page}`;

        // 1. Compartimentos (pavimento + teto). Inserimos sempre o room
        //    quando há rooms ou wallSurfaces ou baseboards a enviar — o
        //    perímetro real vai para perimetro_m e a área para area_m2.
        if (
          includeDerived.rooms ||
          includeDerived.baseboards ||
          includeDerived.wallSurfaces
        ) {
          quantities.rooms.forEach((rm, idx) => {
            const src = rm.source as any;
            if (excludeReviewRequired && src?.review_required) return;
            const tipo = ROOM_TYPE_MAP[rm.tipo_normalizado ?? ""] ?? "habitacao";
            roomsRows.push({
              plan_import_id: planImportId,
              user_id: user.id,
              nome: rm.name,
              tipo_compartimento: tipo,
              boundary_coords: [
                { x: Number(src?.center_x) || 0, y: Number(src?.center_y) || 0 },
              ],
              area_m2: rm.area_m2,
              perimetro_m: rm.perimetro_m,
              pe_direito_m: rm.pe_direito_m,
              observacao: folhaTag,
              estado_validacao: "pendente",
              origem: "axia",
              confidence: confidenceFromScore(rm.confidence),
            });
          });
        }

        // 2. Rodapé — registos lineares por compartimento
        if (includeDerived.baseboards) {
          quantities.baseboards.forEach((b) => {
            if (b.valor <= 0) return;
            measurementsRows.push({
              plan_import_id: planImportId,
              user_id: user.id,
              tipo: "linha",
              coordinates: [{ x: 0, y: 0 }],
              valor_bruto: b.valor,
              unidade: "ml",
              etiqueta: `Rodapé — ${b.room_name}`,
              camada: "rodape",
              cor: "#f59e0b",
              estado_validacao: "pendente",
              confidence: "provavel",
              measurement_origin: "derivado",
              observacao: `${folhaTag} · Perímetro ${b.raw_perimeter}m − ${b.discounted_openings_m}m vãos`,
            });
          });
        }

        // 3. Paredes — m² líquidos para revestir/pintar/barrar
        if (includeDerived.wallSurfaces) {
          quantities.wallSurfaces.forEach((w) => {
            if (w.valor <= 0) return;
            measurementsRows.push({
              plan_import_id: planImportId,
              user_id: user.id,
              tipo: "area",
              coordinates: [{ x: 0, y: 0 }],
              valor_bruto: w.valor,
              unidade: "m²",
              etiqueta: `Paredes — ${w.room_name}`,
              camada: "paredes",
              cor: "#8b5cf6",
              estado_validacao: "pendente",
              confidence: "provavel",
              measurement_origin: "derivado",
              observacao: `${folhaTag} · Bruto ${w.raw_area}m² − ${w.openings_area_m2}m² vãos`,
            });
          });
        }

        // 4. Vãos agrupados por dimensão → plan_placed_elements
        if (includeDerived.openings) {
          quantities.openingsByDim.forEach((o) => {
            if (excludeReviewRequired && o.review_required) return;
            // Posição = média das posições dos elementos do bucket
            const posList = o.elements.filter((e) => e.position_x != null);
            const x = posList.length
              ? posList.reduce((s, e) => s + (Number(e.position_x) || 0), 0) / posList.length
              : 0.5;
            const y = posList.length
              ? posList.reduce((s, e) => s + (Number(e.position_y) || 0), 0) / posList.length
              : 0.5;
            elementsRows.push({
              plan_import_id: planImportId,
              user_id: user.id,
              symbol_type_id: `${o.type}_${o.largura_cm}x${o.altura_cm}`,
              category: "vaos",
              subcategory: o.label, // ex: "Porta interior 80×210" — vira a descrição na view
              x,
              y,
              quantity: o.qtd,
              note: `${folhaTag} · ${o.largura_cm}×${o.altura_cm}cm${o.review_required ? " (validar)" : ""}`,
              origin: "axia",
            });
          });
        }
      }

      let inserted = 0;
      let removed = 0;

      // Limpar análise anterior da Axia para esta planta antes de inserir
      if (replacePrevious) {
        // 1. plan_measurements derivadas
        const { data: oldMeas, error: oldMeasErr } = await supabase
          .from("plan_measurements")
          .delete()
          .eq("plan_import_id", planImportId)
          .eq("measurement_origin", "derivado")
          .select("id");
        if (oldMeasErr) throw oldMeasErr;
        removed += oldMeas?.length ?? 0;

        // 2. plan_rooms gerados pela Axia
        const { data: oldRooms, error: oldRoomsErr } = await supabase
          .from("plan_rooms")
          .delete()
          .eq("plan_import_id", planImportId)
          .eq("origem", "axia")
          .select("id");
        if (oldRoomsErr) throw oldRoomsErr;
        removed += oldRooms?.length ?? 0;

        // 3. plan_placed_elements desta planta criados pela Axia
        //    (apaga apenas elementos com origin='axia' — nunca toca em
        //    elementos colocados manualmente pelo utilizador)
        const { data: oldEl, error: oldElErr } = await supabase
          .from("plan_placed_elements")
          .delete()
          .eq("plan_import_id", planImportId)
          .eq("origin", "axia")
          .select("id");
        if (oldElErr) throw oldElErr;
        removed += oldEl?.length ?? 0;
      }

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

      const removedMsg = replacePrevious && removed > 0 ? ` (${removed} anteriores removidos)` : "";
      toast.success(
        `${inserted} quantitativo(s) adicionados à Tabela Unificada${removedMsg}`,
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
            Enviar quantitativos para a Tabela Unificada
          </DialogTitle>
          <DialogDescription>
            A Axia transforma os elementos identificados em <strong>quantitativos
            orçamentáveis</strong>: vãos agrupados por dimensão, rodapé pelo
            perímetro do compartimento descontando portas, e área de paredes
            para revestimentos / pintura.
            {planName ? <> Planta: <strong>{planName}</strong>.</> : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Categorias derivadas */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">
              Quantitativos a gerar
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(DERIVED_LABEL) as DerivedKey[]).map((k) => (
                <label
                  key={k}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={includeDerived[k]}
                    onCheckedChange={() => toggleDerived(k)}
                  />
                  <span className="text-sm">{DERIVED_LABEL[k]}</span>
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer hover:bg-muted/40 mt-2 w-fit">
              <Checkbox
                checked={excludeReviewRequired}
                onCheckedChange={(v) => setExcludeReviewRequired(!!v)}
              />
              <span className="text-xs">
                Excluir compartimentos/vãos marcados para validação humana
              </span>
            </label>
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-md border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 cursor-pointer hover:bg-amber-100 mt-2 w-fit">
              <Checkbox
                checked={replacePrevious}
                onCheckedChange={(v) => setReplacePrevious(!!v)}
              />
              <span className="text-xs font-medium">
                Substituir análise anterior (limpa quantitativos da Axia já existentes nesta planta)
              </span>
            </label>
          </div>

          {/* Pages */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Folhas analisadas</span>
              <Badge variant="secondary">{pages.length}</Badge>
            </div>
            <ScrollArea className="h-[160px] rounded-md border p-2">
              <div className="space-y-1">
                {pages.map((p) => (
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
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Summary */}
          <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex items-center justify-between font-medium">
              <span>Total a enviar</span>
              <span>{preview.total} item(s)</span>
            </div>
            {includeDerived.rooms && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pavimento + Teto</span>
                <span>{preview.rooms}</span>
              </div>
            )}
            {includeDerived.baseboards && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Rodapé</span>
                <span>{preview.baseboards}</span>
              </div>
            )}
            {includeDerived.wallSurfaces && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Paredes (m²)</span>
                <span>{preview.walls}</span>
              </div>
            )}
            {includeDerived.openings && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Vãos por dimensão</span>
                <span>{preview.openings}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending || preview.total === 0}>
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
