import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Brain,
  Loader2,
  Ruler,
  DoorOpen,
  Columns3,
  ChevronDown,
  Eye,
  MapPin,
  AlertTriangle,
  Table2,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlanAxiaResultsTable } from "./PlanAxiaResultsTable";
import { PlanPagesPanel } from "./PlanPagesPanel";

export interface AxiaBBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface PlanAnalysisResult {
  scale_detected: {
    found: boolean;
    value?: string;
    reference_dimension?: string;
  };
  sheet_classification?: {
    type?: string;
    piso?: string;
    titulo?: string;
    escala?: string;
    norte_presente?: boolean;
    legenda_presente?: boolean;
    carimbo_presente?: boolean;
  };
  dimensions: Array<{
    value: number;
    unit: string;
    label: string;
    raw_text?: string;
    valor_nao_legivel?: boolean;
    position_x: number;
    position_y: number;
    bbox?: AxiaBBox;
    confidence: number;
    review_required?: boolean;
    associated_to?: string;
  }>;
  rooms: Array<{
    name: string;
    tipo_normalizado?: string;
    estimated_area?: number;
    perimetro_estimado_m?: number;
    vaos_porta_associados?: string[];
    area_legivel?: boolean;
    center_x: number;
    center_y: number;
    bbox?: AxiaBBox;
    confidence: number;
    review_required?: boolean;
    evidencias?: string[];
  }>;
  elements: Array<{
    type: string;
    label: string;
    position_x: number;
    position_y: number;
    bbox?: AxiaBBox;
    count?: number;
    largura_cm?: number;
    altura_cm?: number;
    dimensao_legivel?: boolean;
    parede_associada?: string;
    compartimentos_conectados?: string[];
    largura_legivel?: boolean;
    confidence_score?: number;
    review_required?: boolean;
  }>;
  walls?: Array<{
    tipo: string;
    orientacao: string;
    bbox?: AxiaBBox;
    compartimento_associado?: string;
    confidence_score: number;
    review_required?: boolean;
    evidencias?: string[];
    notes?: string;
  }>;
  exterior_elements?: Array<{
    tipo: string;
    bbox?: AxiaBBox;
    confidence_score: number;
    notes?: string;
  }>;
  reading_quality?: {
    overall_confidence?: number;
    image_quality?: "alta" | "media" | "baixa";
    text_legibility?: "alta" | "media" | "baixa";
    dimensions_legibility?: "alta" | "media" | "baixa";
    risk_level?: "baixo" | "medio" | "alto";
    human_intervention_required?: boolean;
  };
  limitations?: string[];
  validation_questions?: string[];
  summary: string;
}

const SHEET_TYPE_LABEL: Record<string, string> = {
  planta_piso: "Planta de Piso",
  implantacao: "Implantação",
  corte: "Corte",
  alcado: "Alçado",
  detalhe: "Detalhe",
  legenda: "Legenda",
  outro: "Outro",
};

interface PlanAIAnalysisProps {
  imageDataUrl: string | null;
  calibration: {
    pixels_per_meter: number;
    real_distance: number;
    unidade: string;
  } | null;
  onHighlightPosition?: (x: number, y: number) => void;
  onConvertDimensions?: (dimensions: PlanAnalysisResult["dimensions"]) => void;
  onAnalysisComplete?: () => void;
  // Multi-page support - controlled from parent so analyses persist per page
  result?: PlanAnalysisResult | null;
  onResultChange?: (result: PlanAnalysisResult | null) => void;
  currentPage?: number;
  totalPages?: number;
  onSelectPage?: (page: number) => void;
  analyzedPages?: number[];
  onAnalyzeAllPending?: () => void;
  /** When this number increments, the panel auto-triggers analysis on the current page once the image is ready. */
  autoAnalyzeToken?: number;
  /** Map of page -> analysis result, for the "send all to Quantitativos" flow. */
  resultsByPage?: Record<number, PlanAnalysisResult>;
  obraId?: string;
  planImportId?: string;
  planName?: string;
}

function normalizePlanAnalysisResult(input: any): PlanAnalysisResult | null {
  if (!input || typeof input !== "object") return null;

  const rawRooms = Array.isArray(input?.rooms)
    ? input.rooms
    : Array.isArray(input?.compartments)
      ? input.compartments
      : [];

  const rooms = rawRooms
    .filter((room: any) => room && typeof room === "object")
    .map((room: any) => {
      const bbox = Array.isArray(room?.bbox)
        ? {
            x_min: Number(room.bbox[0] ?? 0),
            y_min: Number(room.bbox[1] ?? 0),
            x_max: Number(room.bbox[2] ?? 0),
            y_max: Number(room.bbox[3] ?? 0),
          }
        : room?.bbox;

      return {
        ...room,
        name: room?.name ?? room?.nome ?? "Compartimento",
        tipo_normalizado: room?.tipo_normalizado ?? room?.normalized_type ?? room?.tipo ?? "indefinido",
        estimated_area: room?.estimated_area ?? room?.area_estimada ?? 0,
        perimetro_estimado_m: room?.perimetro_estimado_m ?? room?.estimated_perimeter_m ?? 0,
        vaos_porta_associados: Array.isArray(room?.vaos_porta_associados)
          ? room.vaos_porta_associados
          : Array.isArray(room?.connected_door_openings)
            ? room.connected_door_openings
            : [],
        area_legivel: room?.area_legivel ?? room?.area_legible ?? false,
        center_x: room?.center_x ?? room?.position_x ?? (bbox ? (bbox.x_min + bbox.x_max) / 2 : 0.5),
        center_y: room?.center_y ?? room?.position_y ?? (bbox ? (bbox.y_min + bbox.y_max) / 2 : 0.5),
        bbox,
        confidence: room?.confidence ?? room?.confidence_score ?? 0,
        review_required: room?.review_required ?? room?.needs_review ?? false,
        evidencias: Array.isArray(room?.evidencias)
          ? room.evidencias
          : Array.isArray(room?.evidences)
            ? room.evidences
            : [],
      };
    });

  return {
    ...input,
    sheet_classification: input?.sheet_classification
      ? {
          ...input.sheet_classification,
          piso: input.sheet_classification?.piso ?? input.sheet_classification?.floor,
          titulo: input.sheet_classification?.titulo ?? input.sheet_classification?.title,
          norte_presente: input.sheet_classification?.norte_presente ?? input.sheet_classification?.north_present,
          legenda_presente: input.sheet_classification?.legenda_presente ?? input.sheet_classification?.legend_present,
          carimbo_presente: input.sheet_classification?.carimbo_presente ?? input.sheet_classification?.stamp_present,
        }
      : undefined,
    scale_detected:
      input?.scale_detected ??
      input?.calibration?.scale_detected ?? {
        found: false,
      },
    dimensions: Array.isArray(input?.dimensions) ? input.dimensions : [],
    rooms,
    elements: Array.isArray(input?.elements) ? input.elements : [],
    walls: Array.isArray(input?.walls) ? input.walls : [],
    exterior_elements: Array.isArray(input?.exterior_elements) ? input.exterior_elements : [],
    limitations: Array.isArray(input?.limitations) ? input.limitations : [],
    validation_questions: Array.isArray(input?.validation_questions) ? input.validation_questions : [],
    summary: typeof input?.summary === "string" ? input.summary : "",
  };
}

export function PlanAIAnalysis({
  imageDataUrl,
  calibration,
  onHighlightPosition,
  onConvertDimensions,
  onAnalysisComplete,
  result: controlledResult,
  onResultChange,
  currentPage = 1,
  totalPages = 1,
  onSelectPage,
  analyzedPages = [],
  onAnalyzeAllPending,
  autoAnalyzeToken,
  resultsByPage,
  obraId,
  planImportId,
  planName,
}: PlanAIAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);
  const [internalResult, setInternalResult] = useState<PlanAnalysisResult | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState({
    dimensions: true,
    rooms: true,
    elements: false,
  });

  // Use controlled result when parent provides one, fall back to internal state
  const isControlled = onResultChange !== undefined;
  const result = isControlled
    ? normalizePlanAnalysisResult(controlledResult)
    : normalizePlanAnalysisResult(internalResult);
  const setResult = (next: PlanAnalysisResult | null) => {
    const normalized = next ? normalizePlanAnalysisResult(next) : null;
    if (isControlled) onResultChange?.(normalized);
    else setInternalResult(normalized);
  };

  // Pending auto-analyze trigger after page switch (used by "Analisar todas")
  const lastTokenRef = useRef<number | undefined>(undefined);

  // Downscale the rendered image before sending to the Vision LLM.
  // Legibilidade de cotas e nomes de compartimentos exige alta resolução:
  // 2400 px no lado maior + JPEG q=0.92 mantém o payload <6 MB (limite 12 MB
  // na edge function) e dá ao modelo detalhe suficiente para ler texto fino.
  const downscaleForAI = (src: string, maxSide = 2400, quality = 0.92): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const longest = Math.max(img.width, img.height);
        const ratio = longest > maxSide ? maxSide / longest : 1;
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas 2D not available"));
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl.split(",")[1] ?? "");
      };
      img.onerror = () => reject(new Error("Falha ao carregar imagem para análise"));
      // Required for cross-origin signed URLs, otherwise canvas becomes tainted
      // and toDataURL throws SecurityError ("Tainted canvases may not be exported").
      if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
      img.src = src;
    });

  const isAnalysisEmpty = (a: PlanAnalysisResult) =>
    (!a.dimensions || a.dimensions.length === 0) &&
    (!a.rooms || a.rooms.length === 0) &&
    (!a.elements || a.elements.length === 0) &&
    (!a.walls || a.walls.length === 0);

  const callAxia = async (base64: string, hint?: "high_res_retry") => {
    return await supabase.functions.invoke("axia-plan-vision", {
      body: {
        image_base64: base64,
        calibration_info: calibration,
        plan_import_id: planImportId,
        page_number: currentPage,
        retry_hint: hint,
      },
    });
  };

  const handleAnalyze = async () => {
    if (!imageDataUrl) {
      toast.error("Nenhuma planta carregada");
      return;
    }

    const startedAt = Date.now();
    console.info("[plan/axia] analyze start", { planImportId, page: currentPage, hasPrev: !!result });
    setLastError(null);
    setIsAnalyzing(true);
    // Importante: NÃO limpamos `result` durante a reanálise - se a Axia
    // falhar mantemos os dados anteriores e mostramos um banner de erro
    // com possibilidade de tentar de novo.
    try {
      const base64 = await downscaleForAI(imageDataUrl);
      let { data, error } = await callAxia(base64);

      if (error) {
        // Quando a edge devolve non-2xx, supabase-js entrega o body em `data` na mesma.
        if (!data?.analysis && !data?.error) {
          const msg = (error as any)?.message || (typeof error === "string" ? error : "Falha na comunicação com a Axia");
          throw new Error(msg);
        }
      }
      if (data?.error) {
        const errStr = typeof data.error === "string" ? data.error : (data.error?.message || data.error?.code || "");
        if (errStr === "Rate limit exceeded") { toast.error("Limite de pedidos atingido. Tente novamente em breve."); setLastError("Limite de pedidos atingido"); return; }
        if (errStr === "Credits exhausted") { toast.error("Créditos de IA esgotados."); setLastError("Créditos de IA esgotados"); return; }
        if (!data?.analysis && typeof data.error === "string") { throw new Error(errStr); }
      }

      const normalize = (a: PlanAnalysisResult): PlanAnalysisResult => normalizePlanAnalysisResult(a);

      if (data?.success === false) {
        const msg = data?.error?.message || "A Axia não conseguiu interpretar esta planta automaticamente.";
        toast.warning(msg);
        setLastError(msg);
        if (data?.analysis) setResult(normalize(data.analysis as PlanAnalysisResult));
        return;
      }

      if (data?.analysis) {
        let safe = normalize(data.analysis as PlanAnalysisResult);

        const limitationsText = (safe.limitations ?? []).join(" ").toLowerCase();
        const lowLegibility =
          limitationsText.includes("resolu") ||
          limitationsText.includes("legib") ||
          limitationsText.includes("ileg") ||
          safe.reading_quality?.dimensions_legibility === "baixa" ||
          safe.reading_quality?.text_legibility === "baixa";

        if (isAnalysisEmpty(safe) && lowLegibility) {
          toast.info("A Axia vai re-analisar com o modelo de alta precisão…");
          const retry = await callAxia(base64, "high_res_retry");
          const retryData = retry.data as any;
          if (retryData?.analysis) {
            const retrySafe = normalize(retryData.analysis as PlanAnalysisResult);
            if (!isAnalysisEmpty(retrySafe)) safe = retrySafe;
          }
        }

        setResult(safe);
        setAnalyzedAt(new Date());
        console.info("[plan/axia] analyze ok", {
          page: currentPage,
          ms: Date.now() - startedAt,
          dims: safe.dimensions.length,
          rooms: safe.rooms.length,
          elements: safe.elements.length,
        });
        toast.success(`Análise concluída: ${safe.dimensions.length} cotas, ${safe.rooms.length} compartimentos identificados`);
        onAnalysisComplete?.();
      } else {
        const msg = "A IA não conseguiu analisar esta planta.";
        toast.warning(msg);
        setLastError(msg);
      }
    } catch (err: any) {
      console.error("[plan/axia] analyze error", err);
      const msg = err?.message && err.message !== "[object Object]"
        ? err.message
        : (typeof err === "string" ? err : (err?.error?.message || err?.code || "erro desconhecido"));
      setLastError(msg);
      toast.error("Erro na análise: " + msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-trigger analyze when parent bumps the token (sequential "analyze all" flow)
  useEffect(() => {
    if (autoAnalyzeToken === undefined) return;
    if (autoAnalyzeToken === lastTokenRef.current) return;
    if (!imageDataUrl) return;
    lastTokenRef.current = autoAnalyzeToken;
    handleAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyzeToken, imageDataUrl]);

  const confidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return <Badge variant="default" className="text-[9px] px-1">Alta</Badge>;
    if (confidence >= 0.5) return <Badge variant="secondary" className="text-[9px] px-1">Média</Badge>;
    return <Badge variant="outline" className="text-[9px] px-1">Baixa</Badge>;
  };

  const handleAnalyzeCurrentPage = () => {
    handleAnalyze();
  };

  return (
    <>
      {/* Multi-page panel (only when PDF has more than one sheet) */}
      <PlanPagesPanel
        totalPages={totalPages}
        currentPage={currentPage}
        analyzedPages={analyzedPages}
        isAnalyzing={isAnalyzing}
        onSelectPage={(p) => onSelectPage?.(p)}
        onAnalyzeCurrentPage={handleAnalyzeCurrentPage}
        onAnalyzeAllPending={() => onAnalyzeAllPending?.()}
      />

      <Card>
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4" style={{ color: "#00679d" }} />
            <span style={{ color: "#00679d" }}>Axia™</span> Análise Visual
            {totalPages > 1 && (
              <Badge variant="outline" className="ml-auto text-[10px]">Folha {currentPage}/{totalPages}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!result ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                A Axia™ analisa a planta para identificar automaticamente cotas, dimensões, compartimentos e elementos construtivos.
              </p>
              <Button
                className="w-full"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !imageDataUrl}
                style={!isAnalyzing ? { backgroundColor: "#00679d" } : undefined}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A analisar planta...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Analisar com IA
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-2">
              {/* Reanalisar + timestamp */}
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground">
                  {analyzedAt ? `Última análise: ${analyzedAt.toLocaleTimeString()}` : "Análise em cache"}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !imageDataUrl}
                  className="h-7 text-[11px]"
                >
                  {isAnalyzing ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> A reanalisar…</>
                  ) : (
                    <>Reanalisar</>
                  )}
                </Button>
              </div>

              {/* Error banner - keeps previous result visible */}
              {lastError && (
                <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                  <div className="text-[11px] text-destructive leading-snug flex-1">
                    <strong>Última reanálise falhou:</strong> {lastError}
                    <div className="opacity-80">Os dados anteriores foram mantidos.</div>
                  </div>
                </div>
              )}

              {/* Sheet classification header */}
              {result.sheet_classification && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  {result.sheet_classification.type && (
                    <Badge variant="default" className="text-[10px]">
                      {SHEET_TYPE_LABEL[result.sheet_classification.type] ?? result.sheet_classification.type}
                    </Badge>
                  )}
                  {result.sheet_classification.piso && (
                    <Badge variant="outline" className="text-[10px]">Piso: {result.sheet_classification.piso}</Badge>
                  )}
                  {result.sheet_classification.escala && (
                    <Badge variant="outline" className="text-[10px]">Esc. {result.sheet_classification.escala}</Badge>
                  )}
                  {result.sheet_classification.norte_presente && (
                    <Badge variant="secondary" className="text-[10px]">Norte ✓</Badge>
                  )}
                </div>
              )}

              {/* Reading-quality banner */}
              {result.reading_quality && (result.reading_quality.human_intervention_required || result.reading_quality.risk_level === "alto") && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-800 dark:text-amber-200 leading-snug">
                    <strong>Validação humana recomendada.</strong>{" "}
                    Qualidade de imagem: {result.reading_quality.image_quality ?? "?"} · cotas: {result.reading_quality.dimensions_legibility ?? "?"} · risco: {result.reading_quality.risk_level ?? "?"}.
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-muted rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">{result.summary}</p>
              </div>

              {/* Review-required summary banner */}
              {(() => {
                const dimsR = result.dimensions.filter((d) => d.review_required || d.valor_nao_legivel).length;
                const roomsR = result.rooms.filter((r) => r.review_required).length;
                const elsR = result.elements.filter((e) => e.review_required).length;
                const wallsR = (result.walls ?? []).filter((w) => w.review_required).length;
                const total = dimsR + roomsR + elsR + wallsR;
                if (total === 0) {
                  return (
                    <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-200 dark:border-emerald-900 rounded-lg p-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-200 leading-snug">
                        Sem itens pendentes de validação. Pode prosseguir para Quantitativos com segurança.
                      </p>
                    </div>
                  );
                }
                const parts: string[] = [];
                if (dimsR) parts.push(`${dimsR} cota${dimsR > 1 ? "s" : ""}`);
                if (roomsR) parts.push(`${roomsR} compartimento${roomsR > 1 ? "s" : ""}`);
                if (elsR) parts.push(`${elsR} elemento${elsR > 1 ? "s" : ""}`);
                if (wallsR) parts.push(`${wallsR} parede${wallsR > 1 ? "s" : ""}`);
                const confirmAll = () => {
                  if (!result) return;
                  const next: PlanAnalysisResult = {
                    ...result,
                    dimensions: result.dimensions.map((d) => ({ ...d, review_required: false })),
                    rooms: result.rooms.map((r) => ({ ...r, review_required: false })),
                    elements: result.elements.map((e) => ({ ...e, review_required: false })),
                    walls: (result.walls ?? []).map((w) => ({ ...w, review_required: false })),
                  };
                  setResult(next);
                  toast.success(`${total} item(ns) marcados como confirmados.`);
                };
                return (
                  <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-2.5 space-y-2">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                          {total} valor{total > 1 ? "es" : ""} a rever antes de orçamentar
                        </p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-snug">
                          A Axia inferiu ou estimou: {parts.join(" · ")}. Reveja na tabela completa e confirme antes de enviar para Quantitativos.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-[11px] bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => setShowTable(true)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Rever e confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] border-amber-300 text-amber-900 dark:text-amber-100"
                        onClick={confirmAll}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Confirmar tudo
                      </Button>
                    </div>
                  </div>
                );
              })()}

              {/* Open full table button */}
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => setShowTable(true)}
              >
                <Table2 className="w-3.5 h-3.5 mr-1.5" />
                Ver tabela completa ({result.dimensions.length + result.rooms.length + result.elements.length} itens)
              </Button>

              {/* Scale */}
              {result.scale_detected.found && (
                <div className="flex items-center gap-2 bg-accent/50 rounded-lg p-2">
                  <Ruler className="w-3.5 h-3.5 text-primary shrink-0" />
                  <p className="text-xs">
                    Escala detetada: <span className="font-semibold">{result.scale_detected.value}</span>
                    {result.scale_detected.reference_dimension && (
                      <span className="text-muted-foreground"> ({result.scale_detected.reference_dimension})</span>
                    )}
                  </p>
                </div>
              )}

              {/* Dimensions */}
              {result.dimensions.length > 0 && (
                <Collapsible
                  open={sectionsOpen.dimensions}
                  onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, dimensions: open }))}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1">
                    <span className="flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5" />
                      Cotas ({result.dimensions.length})
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sectionsOpen.dimensions ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    {result.dimensions.slice(0, 5).map((dim, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => onHighlightPosition?.(dim.position_x, dim.position_y)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{dim.value} {dim.unit}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{dim.label}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {confidenceBadge(dim.confidence)}
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                    {result.dimensions.length > 5 && (
                      <p className="text-[10px] text-muted-foreground text-center py-1">
                        + {result.dimensions.length - 5} cotas - abrir tabela completa para ver todas
                      </p>
                    )}
                    {onConvertDimensions && result.dimensions.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConvertDimensions(result.dimensions);
                        }}
                      >
                        <Ruler className="w-3 h-3 mr-1.5" />
                        Converter {result.dimensions.length} cotas em medições pendentes
                      </Button>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Rooms */}
              {result.rooms.length > 0 && (
                <Collapsible
                  open={sectionsOpen.rooms}
                  onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, rooms: open }))}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1">
                    <span className="flex items-center gap-1.5">
                      <DoorOpen className="w-3.5 h-3.5" />
                      Compartimentos ({result.rooms.length})
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sectionsOpen.rooms ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    {result.rooms.slice(0, 5).map((room, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => onHighlightPosition?.(room.center_x, room.center_y)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{room.name}</p>
                          {room.estimated_area && (
                            <p className="text-[10px] text-muted-foreground">≈ {room.estimated_area.toFixed(1)} m²</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {confidenceBadge(room.confidence)}
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                    {result.rooms.length > 5 && (
                      <p className="text-[10px] text-muted-foreground text-center py-1">
                        + {result.rooms.length - 5} compartimentos - abrir tabela completa para ver todos
                      </p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Elements */}
              {result.elements.length > 0 && (
                <Collapsible
                  open={sectionsOpen.elements}
                  onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, elements: open }))}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1">
                    <span className="flex items-center gap-1.5">
                      <Columns3 className="w-3.5 h-3.5" />
                      Elementos ({result.elements.length})
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sectionsOpen.elements ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    {result.elements.slice(0, 5).map((el, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => onHighlightPosition?.(el.position_x, el.position_y)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{el.label}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{el.type}{el.count && el.count > 1 ? ` (×${el.count})` : ""}</p>
                        </div>
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                    {result.elements.length > 5 && (
                      <p className="text-[10px] text-muted-foreground text-center py-1">
                        + {result.elements.length - 5} elementos - abrir tabela completa para ver todos
                      </p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Walls summary */}
              {result.walls && result.walls.length > 0 && (
                <div className="rounded-lg border p-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Columns3 className="w-3.5 h-3.5" />
                    Paredes ({result.walls.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(
                      result.walls.reduce<Record<string, number>>((acc, w) => {
                        acc[w.tipo] = (acc[w.tipo] ?? 0) + 1;
                        return acc;
                      }, {})
                    ).map(([tipo, n]) => (
                      <Badge key={tipo} variant="outline" className="text-[10px]">
                        {tipo.replace("parede_", "").replace("_", " ")}: {n}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Limitations & validation questions */}
              {((result.limitations?.length ?? 0) > 0 || (result.validation_questions?.length ?? 0) > 0) && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Validações da Axia ({(result.limitations?.length ?? 0) + (result.validation_questions?.length ?? 0)})
                    </span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-1">
                    {result.limitations && result.limitations.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Limitações</p>
                        <ul className="text-[11px] space-y-0.5 pl-3 list-disc text-muted-foreground">
                          {result.limitations.map((l, i) => <li key={i}>{l}</li>)}
                        </ul>
                      </div>
                    )}
                    {result.validation_questions && result.validation_questions.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Perguntas a confirmar</p>
                        <ul className="text-[11px] space-y-0.5 pl-3 list-disc text-muted-foreground">
                          {result.validation_questions.map((q, i) => <li key={i}>{q}</li>)}
                        </ul>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}


              {!result.scale_detected.found && !calibration && (
                <div className="flex items-start gap-2 bg-destructive/10 rounded-lg p-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-[10px] text-destructive">
                    Escala não detetada. Calibre manualmente para obter medições precisas.
                  </p>
                </div>
              )}

              {/* Re-analyze button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Brain className="w-3.5 h-3.5 mr-1.5" style={{ color: "#00679d" }} />
                )}
                Reanalisar esta folha
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <PlanAxiaResultsTable
          open={showTable}
          onOpenChange={setShowTable}
          dimensions={result.dimensions}
          rooms={result.rooms}
          elements={result.elements}
          walls={result.walls}
          exteriorElements={result.exterior_elements}
          sheetClassification={result.sheet_classification}
          readingQuality={result.reading_quality}
          limitations={result.limitations}
          validationQuestions={result.validation_questions}
          onHighlightPosition={onHighlightPosition}
          pageLabel={totalPages > 1 ? `Folha ${currentPage}/${totalPages}` : undefined}
          resultsByPage={resultsByPage}
          obraId={obraId}
          planImportId={planImportId}
          planName={planName}
        />
      )}
    </>
  );
}
