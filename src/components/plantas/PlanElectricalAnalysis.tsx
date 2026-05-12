import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Zap, Loader2, ChevronDown, AlertTriangle, CircuitBoard, Info,
  Lightbulb, Plug, ToggleLeft, ShieldCheck, Eye, FileSpreadsheet, BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type SheetSubtype =
  | "planta_instalacoes_eletricas" | "planta_iluminacao" | "planta_tomadas_alimentacoes"
  | "pontos_eletricos_cotados" | "diagrama_unifilar" | "tabela_cargas"
  | "quadro_distribuicao" | "detalhe_vista_eletrica" | "legenda_simbolos" | "outro";

const SHEET_LABELS: Record<SheetSubtype, string> = {
  planta_instalacoes_eletricas: "Planta de instalações elétricas",
  planta_iluminacao: "Planta de iluminação",
  planta_tomadas_alimentacoes: "Planta de tomadas / alimentações",
  pontos_eletricos_cotados: "Pontos elétricos cotados",
  diagrama_unifilar: "Diagrama unifilar",
  tabela_cargas: "Tabela de cargas",
  quadro_distribuicao: "Quadro de distribuição",
  detalhe_vista_eletrica: "Detalhe / vista técnica",
  legenda_simbolos: "Legenda de símbolos",
  outro: "Outro tipo de folha",
};

const ALLOWS_VISUAL = new Set<SheetSubtype>([
  "planta_instalacoes_eletricas", "planta_iluminacao",
  "planta_tomadas_alimentacoes", "pontos_eletricos_cotados",
]);

interface PlacedSymbol {
  symbol_key: string;
  label?: string;
  count: number;
  installation_height?: string;
  circuit_number?: string;
  distribution_board?: string;
  voltage?: number;
  power_w?: number;
  cable_section_mm2?: number;
  breaker_rating_a?: number;
  room_name?: string;
  is_existing?: boolean;
  technical_note?: string;
  data_source?: string;
  confidence: number;
  review_required?: boolean;
}

interface DeclaredQuantity {
  symbol_key: string;
  label?: string;
  quantity: number;
  unit: string;
  source_table_name?: string;
}

interface Circuit {
  circuit_number?: string;
  description: string;
  distribution_board?: string;
  voltage?: number;
  power_w?: number;
  cable_section_mm2?: number;
  breaker_rating_a?: number;
}

interface Discrepancy {
  symbol_key: string;
  visual_count: number;
  declared_count: number;
  message: string;
}

interface LegendItem {
  symbol_visual?: string;
  symbol_key: string;
  meaning: string;
}

interface Recommendation { type: "info" | "warning" | "alert"; message: string; }

interface AnalysisResult {
  sheet_subtype: SheetSubtype;
  scale_detected: { found: boolean; value?: string };
  legend_found: boolean;
  placed_symbols: PlacedSymbol[];
  declared_quantities: DeclaredQuantity[];
  legend_map: LegendItem[];
  circuits: Circuit[];
  discrepancies: Discrepancy[];
  total_wire_length_m: number;
  total_conduit_length_m: number;
  summary: string;
  recommendations: Recommendation[];
  review_required: boolean;
}

interface Props {
  imageDataUrl: string | null;
  calibration: { pixels_per_meter: number; real_distance: number; unidade: string; } | null;
  planImportId?: string;
}

const SYMBOL_ICONS: Record<string, typeof Zap> = {
  luz_teto: Lightbulb, luz_parede: Lightbulb, luz_pendente: Lightbulb,
  fluorescente: Lightbulb, led_neon: Lightbulb, refletor: Lightbulb,
  tomada_baixa: Plug, tomada_media: Plug, tomada_alta: Plug,
  tomada_dupla: Plug, tomada_trifasica: Plug,
  interruptor_simples: ToggleLeft, interruptor_duplo: ToggleLeft, interruptor_paralelo: ToggleLeft,
  quadro_distribuicao: CircuitBoard, disjuntor: ShieldCheck,
};

async function normalizeImageToJpegBase64(imageSource: string): Promise<string> {
  const dataUrl = imageSource.startsWith("data:")
    ? imageSource
    : await fetch(imageSource)
        .then((response) => response.blob())
        .then(
          (blob) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            }),
        );

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao preparar imagem para análise."));
    img.src = dataUrl;
  });

  const maxDim = 2400;
  const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível para análise elétrica.");

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

export function PlanElectricalAnalysis({ imageDataUrl, calibration, planImportId }: Props) {
  const qc = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [sections, setSections] = useState({
    symbols: true, declared: true, discrepancies: true,
    circuits: true, legend: false, recommendations: true,
  });

  const handleAnalyze = async () => {
    if (!imageDataUrl) { toast.error("Nenhuma planta carregada"); return; }
    setIsAnalyzing(true);
    setResult(null);
    try {
      const base64 = await normalizeImageToJpegBase64(imageDataUrl);

      const { data, error } = await supabase.functions.invoke("axia-electrical-analysis", {
        body: {
          image_base64: base64,
          image_mime_type: "image/jpeg",
          calibration_info: calibration,
          plan_import_id: planImportId,
          persist: !!planImportId,
        },
      });
      if (error) throw error;
      if (data?.error && !data?.analysis) {
        toast.error(typeof data.error === "string" ? data.error : data.error?.message ?? "Erro");
        return;
      }
      const a = data?.analysis as AnalysisResult | undefined;
      if (!a) { toast.warning("A Axia™ não conseguiu analisar esta folha."); return; }
      setResult(a);

      const placed = data?.persisted?.placed_elements ?? 0;
      const circs = data?.persisted?.circuits ?? 0;
      const subtypeLabel = SHEET_LABELS[a.sheet_subtype] ?? a.sheet_subtype;

      if (ALLOWS_VISUAL.has(a.sheet_subtype)) {
        toast.success(
          `${subtypeLabel}: ${a.placed_symbols.reduce((s, x) => s + x.count, 0)} símbolos detetados` +
          (placed ? ` · ${placed} guardados na tabela de quantitativos` : "")
        );
      } else {
        toast.success(
          `${subtypeLabel}: ${a.circuits.length} circuito(s) extraído(s)` +
          (circs ? ` · ${circs} guardados` : "") +
          " — não foram contados símbolos como elementos de obra."
        );
      }

      if (a.discrepancies?.length) {
        toast.warning(`${a.discrepancies.length} divergência(s) entre contagem visual e tabela declarada — reveja em baixo.`);
      }

      // Refresh tabela de Quantitativos
      if (planImportId) {
        qc.invalidateQueries({ queryKey: ["plan-quantitativos", planImportId] });
        qc.invalidateQueries({ queryKey: ["plan-quantitativos"] });
        qc.invalidateQueries({ queryKey: ["plan_placed_elements", planImportId] });
      }
    } catch (err: any) {
      console.error("Electrical analysis error:", err);
      toast.error("Erro na análise: " + (err.message || "erro desconhecido"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totalSymbols = result?.placed_symbols?.reduce((s, x) => s + x.count, 0) ?? 0;
  const allowsVisual = result ? ALLOWS_VISUAL.has(result.sheet_subtype) : false;

  const confBadge = (c: number) => {
    if (c >= 0.8) return <Badge variant="default" className="text-[9px] px-1">Alta</Badge>;
    if (c >= 0.5) return <Badge variant="secondary" className="text-[9px] px-1">Média</Badge>;
    return <Badge variant="outline" className="text-[9px] px-1">Baixa</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-primary">Axia™</span> Análise Elétrica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!result ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              A Axia™ identifica o tipo de folha (planta, diagrama, tabela de cargas, legenda…) e adapta a leitura.
              Em plantas reais conta símbolos, em diagramas extrai circuitos e em folhas com tabelas quantitativas
              cruza a contagem visual com a tabela declarada.
            </p>
            {!planImportId && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-2 text-[10px] text-amber-700 dark:text-amber-400 flex gap-1.5">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                Sem planta importada associada — os resultados não serão guardados nos quantitativos.
              </div>
            )}
            <Button className="w-full" onClick={handleAnalyze} disabled={isAnalyzing || !imageDataUrl}>
              {isAnalyzing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />A analisar…</>
              ) : (
                <><Eye className="w-4 h-4 mr-2" />Analisar com Axia</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
            {/* Sub-classificação + summary */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className="text-[10px]">{SHEET_LABELS[result.sheet_subtype]}</Badge>
              {!allowsVisual && (
                <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                  Símbolos NÃO contam como obra
                </Badge>
              )}
              {result.scale_detected.found && (
                <Badge variant="outline" className="text-[10px]">Escala: {result.scale_detected.value}</Badge>
              )}
              {result.legend_found && <Badge variant="outline" className="text-[10px]">✓ Legenda detetada</Badge>}
            </div>
            {result.summary && <div className="bg-muted rounded-lg p-2.5 text-xs text-muted-foreground">{result.summary}</div>}

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{totalSymbols}</p>
                <p className="text-[9px] text-muted-foreground">Símbolos visuais</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {result.declared_quantities.reduce((s, d) => s + d.quantity, 0) || "—"}
                </p>
                <p className="text-[9px] text-muted-foreground">Tabela declarada</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{result.circuits.length}</p>
                <p className="text-[9px] text-muted-foreground">Circuitos</p>
              </div>
            </div>

            {/* Divergências */}
            {result.discrepancies?.length > 0 && (
              <Collapsible open={sections.discrepancies} onOpenChange={(o) => setSections((s) => ({ ...s, discrepancies: o }))}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1 text-amber-700 dark:text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Divergências visual ↔ tabela ({result.discrepancies.length})
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sections.discrepancies ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1">
                  {result.discrepancies.map((d, i) => (
                    <div key={i} className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-2 text-[11px]">
                      <p className="font-medium">{d.symbol_key}</p>
                      <p className="text-muted-foreground">
                        Contagem visual: <strong>{d.visual_count}</strong> · Tabela declarada: <strong>{d.declared_count}</strong>
                      </p>
                      <p className="text-[10px] text-muted-foreground italic mt-0.5">{d.message}</p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Símbolos visuais */}
            {allowsVisual && result.placed_symbols.length > 0 && (
              <Collapsible open={sections.symbols} onOpenChange={(o) => setSections((s) => ({ ...s, symbols: o }))}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1">
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" />Elementos detetados ({totalSymbols})</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sections.symbols ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1">
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] py-1 px-2">Elemento</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 text-center w-12">Qtd</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 text-center w-14">Conf.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.placed_symbols.map((sym, i) => {
                          const Icon = SYMBOL_ICONS[sym.symbol_key] || Zap;
                          return (
                            <TableRow key={i}>
                              <TableCell className="py-1 px-2">
                                <div className="flex items-center gap-1.5">
                                  <Icon className="w-3 h-3 text-amber-500 shrink-0" />
                                  <div>
                                    <p className="text-[11px] font-medium">{sym.label || sym.symbol_key}</p>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {sym.installation_height && <span className="text-[9px] text-muted-foreground">{sym.installation_height}</span>}
                                      {sym.room_name && <span className="text-[9px] text-muted-foreground">· {sym.room_name}</span>}
                                      {sym.circuit_number && <span className="text-[9px] text-muted-foreground">· Circ. {sym.circuit_number}</span>}
                                      {sym.distribution_board && <span className="text-[9px] text-muted-foreground">· {sym.distribution_board}</span>}
                                      {sym.is_existing && <Badge variant="outline" className="text-[8px] px-1 h-4">Existente</Badge>}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center py-1 px-2 text-xs font-semibold">{sym.count}</TableCell>
                              <TableCell className="text-center py-1 px-2">{confBadge(sym.confidence)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Tabela quantitativa declarada */}
            {result.declared_quantities.length > 0 && (
              <Collapsible open={sections.declared} onOpenChange={(o) => setSections((s) => ({ ...s, declared: o }))}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1">
                  <span className="flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />Tabela quantitativa ({result.declared_quantities.length})</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sections.declared ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1">
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="text-[10px] py-1 px-2">Item</TableHead>
                        <TableHead className="text-[10px] py-1 px-2 text-right w-20">Qtd</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {result.declared_quantities.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="py-1 px-2 text-[11px]">{d.label || d.symbol_key}</TableCell>
                            <TableCell className="py-1 px-2 text-[11px] text-right font-semibold">{d.quantity} {d.unit}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Circuitos */}
            {result.circuits.length > 0 && (
              <Collapsible open={sections.circuits} onOpenChange={(o) => setSections((s) => ({ ...s, circuits: o }))}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1">
                  <span className="flex items-center gap-1.5"><CircuitBoard className="w-3.5 h-3.5 text-purple-500" />Circuitos / Quadros ({result.circuits.length})</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sections.circuits ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1">
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="text-[10px] py-1 px-2">Circ.</TableHead>
                        <TableHead className="text-[10px] py-1 px-2">Descrição</TableHead>
                        <TableHead className="text-[10px] py-1 px-2 text-right">Pot.</TableHead>
                        <TableHead className="text-[10px] py-1 px-2 text-right">Secção</TableHead>
                        <TableHead className="text-[10px] py-1 px-2 text-right">Disj.</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {result.circuits.map((c, i) => (
                          <TableRow key={i}>
                            <TableCell className="py-1 px-2 text-[11px] font-mono">{c.circuit_number || "—"}</TableCell>
                            <TableCell className="py-1 px-2 text-[11px]">
                              {c.description}
                              {c.distribution_board && <span className="text-[9px] text-muted-foreground"> · {c.distribution_board}</span>}
                            </TableCell>
                            <TableCell className="py-1 px-2 text-[11px] text-right">{c.power_w ? `${c.power_w}W` : "—"}</TableCell>
                            <TableCell className="py-1 px-2 text-[11px] text-right">{c.cable_section_mm2 ? `${c.cable_section_mm2}mm²` : "—"}</TableCell>
                            <TableCell className="py-1 px-2 text-[11px] text-right">{c.breaker_rating_a ? `${c.breaker_rating_a}A` : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Legenda */}
            {result.legend_map.length > 0 && (
              <Collapsible open={sections.legend} onOpenChange={(o) => setSections((s) => ({ ...s, legend: o }))}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1">
                  <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-slate-500" />Legenda ({result.legend_map.length})</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sections.legend ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1">
                  {result.legend_map.map((l, i) => (
                    <div key={i} className="flex justify-between bg-muted/50 rounded px-2 py-1 text-[11px]">
                      <span className="font-medium">{l.symbol_key}</span>
                      <span className="text-muted-foreground">{l.meaning}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Recomendações */}
            {result.recommendations.length > 0 && (
              <Collapsible open={sections.recommendations} onOpenChange={(o) => setSections((s) => ({ ...s, recommendations: o }))}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1">
                  <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-blue-500" />Recomendações ({result.recommendations.length})</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sections.recommendations ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1">
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg p-2 ${
                      rec.type === "alert" ? "bg-destructive/10"
                      : rec.type === "warning" ? "bg-amber-50 dark:bg-amber-950/30"
                      : "bg-blue-50 dark:bg-blue-950/30"
                    }`}>
                      {rec.type === "alert" ? <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                        : rec.type === "warning" ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        : <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />}
                      <p className="text-[10px]">{rec.message}</p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            <Button variant="outline" size="sm" className="w-full" onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" />}
              Reanalisar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
