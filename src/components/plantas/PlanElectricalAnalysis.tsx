import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Zap, Loader2, ChevronDown, Cable, Package, AlertTriangle,
  CircuitBoard, Info, Lightbulb, Plug, ToggleLeft, ShieldCheck, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ElectricalSymbol {
  type: string;
  label: string;
  count: number;
  height_note?: string;
  circuit?: string;
  confidence: number;
}

interface Circuit {
  number: string;
  description: string;
  voltage?: number;
  power_w?: number;
  wire_section_mm2?: number;
  breaker_a?: number;
  estimated_length_m?: number;
}

interface WireRun {
  from: string;
  to: string;
  estimated_length_m: number;
  wire_type?: string;
  conduit_diameter_mm?: number;
}

interface Material {
  category: string;
  name: string;
  specification?: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface Recommendation {
  type: "info" | "warning" | "alert";
  message: string;
}

interface ElectricalAnalysisResult {
  scale_detected: { found: boolean; value?: string };
  legend_found: boolean;
  symbols: ElectricalSymbol[];
  circuits: Circuit[];
  wire_runs: WireRun[];
  materials_list: Material[];
  total_wire_length_m: number;
  total_conduit_length_m: number;
  summary: string;
  recommendations: Recommendation[];
}

interface Props {
  imageDataUrl: string | null;
  calibration: {
    pixels_per_meter: number;
    real_distance: number;
    unidade: string;
  } | null;
}

const SYMBOL_TYPE_ICONS: Record<string, typeof Zap> = {
  luz_teto: Lightbulb,
  luz_parede: Lightbulb,
  luz_pendente: Lightbulb,
  fluorescente: Lightbulb,
  led_neon: Lightbulb,
  tomada_baixa: Plug,
  tomada_media: Plug,
  tomada_alta: Plug,
  tomada_dupla: Plug,
  tomada_trifasica: Plug,
  interruptor_simples: ToggleLeft,
  interruptor_duplo: ToggleLeft,
  interruptor_paralelo: ToggleLeft,
  quadro_distribuicao: CircuitBoard,
  disjuntor: ShieldCheck,
};

const CATEGORY_LABELS: Record<string, string> = {
  cablagem: "Cablagem",
  conduta: "Condutas",
  mecanismo: "Mecanismos",
  protecao: "Proteção",
  iluminacao: "Iluminação",
  quadro: "Quadro Elétrico",
  acessorio: "Acessórios",
  outro: "Outros",
};

export function PlanElectricalAnalysis({ imageDataUrl, calibration }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ElectricalAnalysisResult | null>(null);
  const [sections, setSections] = useState({
    symbols: true,
    circuits: true,
    wires: false,
    materials: true,
    recommendations: true,
  });

  const handleAnalyze = async () => {
    if (!imageDataUrl) {
      toast.error("Nenhuma planta carregada");
      return;
    }

    setIsAnalyzing(true);
    try {
      let base64: string;
      if (imageDataUrl.startsWith("data:")) {
        base64 = imageDataUrl.split(",")[1];
      } else {
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const r = reader.result as string;
            resolve(r.split(",")[1]);
          };
          reader.readAsDataURL(blob);
        });
      }

      const { data, error } = await supabase.functions.invoke("axia-electrical-analysis", {
        body: {
          image_base64: base64,
          calibration_info: calibration,
        },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit") || data.error.includes("429")) {
          toast.error("Limite de pedidos atingido. Tente novamente em breve.");
        } else if (data.error.includes("Payment") || data.error.includes("402")) {
          toast.error("Créditos de IA esgotados.");
        } else {
          throw new Error(data.error);
        }
        return;
      }

      if (data?.analysis) {
        setResult(data.analysis);
        const symbolCount = data.analysis.symbols?.reduce((sum: number, s: ElectricalSymbol) => sum + s.count, 0) ?? 0;
        const materialCount = data.analysis.materials_list?.length ?? 0;
        toast.success(`Análise concluída: ${symbolCount} elementos elétricos, ${materialCount} materiais identificados`);
      } else {
        toast.warning("A Axia™ não conseguiu analisar esta planta elétrica.");
      }
    } catch (err: any) {
      console.error("Electrical analysis error:", err);
      toast.error("Erro na análise: " + (err.message || "erro desconhecido"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totalSymbols = result?.symbols?.reduce((sum, s) => sum + s.count, 0) ?? 0;

  const confidenceBadge = (c: number) => {
    if (c >= 0.8) return <Badge variant="default" className="text-[9px] px-1">Alta</Badge>;
    if (c >= 0.5) return <Badge variant="secondary" className="text-[9px] px-1">Média</Badge>;
    return <Badge variant="outline" className="text-[9px] px-1">Baixa</Badge>;
  };

  const materialsByCategory = result?.materials_list?.reduce((acc, m) => {
    const cat = m.category || "outro";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {} as Record<string, Material[]>) ?? {};

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: "#f59e0b" }} />
          <span style={{ color: "#00679d" }}>Axia™</span> Análise Elétrica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!result ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              A Axia™ analisa plantas de instalações elétricas para identificar símbolos, contar elementos, medir traçados de fios e gerar o mapa completo de quantidades e materiais.
            </p>
            <div className="bg-muted/50 rounded-lg p-2.5 space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">O que a Axia™ identifica:</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  "Pontos de luz",
                  "Tomadas (baixa/média/alta)",
                  "Interruptores",
                  "Quadros de distribuição",
                  "Traçados de fios",
                  "Circuitos e cargas",
                  "Condutas elétricas",
                  "Materiais necessários",
                ].map((item) => (
                  <span key={item} className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !imageDataUrl}
              style={!isAnalyzing ? { backgroundColor: "#00679d" } : undefined}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A analisar planta elétrica...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Analisar Planta Elétrica
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
            {/* Summary */}
            <div className="bg-muted rounded-lg p-2.5">
              <p className="text-xs text-muted-foreground">{result.summary}</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{totalSymbols}</p>
                <p className="text-[9px] text-muted-foreground">Elementos</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {result.total_wire_length_m ? `${result.total_wire_length_m.toFixed(0)}m` : "—"}
                </p>
                <p className="text-[9px] text-muted-foreground">Cablagem</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-green-700 dark:text-green-400">
                  {result.materials_list?.length ?? 0}
                </p>
                <p className="text-[9px] text-muted-foreground">Materiais</p>
              </div>
            </div>

            {/* Scale & Legend */}
            <div className="flex gap-2 flex-wrap">
              {result.scale_detected.found && (
                <Badge variant="outline" className="text-[10px]">
                  Escala: {result.scale_detected.value}
                </Badge>
              )}
              {result.legend_found && (
                <Badge variant="outline" className="text-[10px]">
                  ✓ Legenda detetada
                </Badge>
              )}
            </div>

            {/* Symbols */}
            {result.symbols.length > 0 && (
              <Collapsible
                open={sections.symbols}
                onOpenChange={(o) => setSections((s) => ({ ...s, symbols: o }))}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Elementos Elétricos ({totalSymbols})
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sections.symbols ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1">
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] py-1 px-2">Elemento</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 text-center w-14">Qtd</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 text-center w-16">Conf.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.symbols.map((sym, i) => {
                          const IconComp = SYMBOL_TYPE_ICONS[sym.type] || Zap;
                          return (
                            <TableRow key={i}>
                              <TableCell className="py-1 px-2">
                                <div className="flex items-center gap-1.5">
                                  <IconComp className="w-3 h-3 text-amber-500 shrink-0" />
                                  <div>
                                    <p className="text-[11px] font-medium">{sym.label}</p>
                                    {sym.height_note && (
                                      <p className="text-[9px] text-muted-foreground">{sym.height_note}</p>
                                    )}
                                    {sym.circuit && (
                                      <p className="text-[9px] text-muted-foreground">Circ. {sym.circuit}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center py-1 px-2">
                                <span className="text-xs font-semibold">{sym.count}</span>
                              </TableCell>
                              <TableCell className="text-center py-1 px-2">{confidenceBadge(sym.confidence)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Circuits */}
            {result.circuits.length > 0 && (
              <Collapsible
                open={sections.circuits}
                onOpenChange={(o) => setSections((s) => ({ ...s, circuits: o }))}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1">
                  <span className="flex items-center gap-1.5">
                    <CircuitBoard className="w-3.5 h-3.5 text-blue-500" />
                    Circuitos ({result.circuits.length})
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sections.circuits ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1">
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] py-1 px-2">Circ.</TableHead>
                          <TableHead className="text-[10px] py-1 px-2">Descrição</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 text-right">Pot.</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 text-right">Secção</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 text-right">Disj.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.circuits.map((circ, i) => (
                          <TableRow key={i}>
                            <TableCell className="py-1 px-2 text-[11px] font-mono">{circ.number}</TableCell>
                            <TableCell className="py-1 px-2 text-[11px]">{circ.description}</TableCell>
                            <TableCell className="py-1 px-2 text-[11px] text-right">
                              {circ.power_w ? `${circ.power_w}W` : "—"}
                            </TableCell>
                            <TableCell className="py-1 px-2 text-[11px] text-right">
                              {circ.wire_section_mm2 ? `${circ.wire_section_mm2}mm²` : "—"}
                            </TableCell>
                            <TableCell className="py-1 px-2 text-[11px] text-right">
                              {circ.breaker_a ? `${circ.breaker_a}A` : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Wire Runs */}
            {result.wire_runs.length > 0 && (
              <Collapsible
                open={sections.wires}
                onOpenChange={(o) => setSections((s) => ({ ...s, wires: o }))}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1">
                  <span className="flex items-center gap-1.5">
                    <Cable className="w-3.5 h-3.5 text-orange-500" />
                    Traçados de Fios ({result.wire_runs.length})
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sections.wires ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1">
                  {result.wire_runs.map((run, i) => (
                    <div key={i} className="bg-muted/50 rounded px-2 py-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px]">
                          <span className="font-medium">{run.from}</span>
                          <span className="text-muted-foreground mx-1">→</span>
                          <span className="font-medium">{run.to}</span>
                        </p>
                        <Badge variant="secondary" className="text-[9px]">{run.estimated_length_m.toFixed(1)}m</Badge>
                      </div>
                      {(run.wire_type || run.conduit_diameter_mm) && (
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {run.wire_type}{run.conduit_diameter_mm ? ` • Ø${run.conduit_diameter_mm}mm` : ""}
                        </p>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-between bg-accent/50 rounded px-2 py-1.5 mt-1">
                    <span className="text-[11px] font-medium">Total Cablagem</span>
                    <span className="text-[11px] font-bold">{result.total_wire_length_m.toFixed(1)} m</span>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Materials */}
            {result.materials_list.length > 0 && (
              <Collapsible
                open={sections.materials}
                onOpenChange={(o) => setSections((s) => ({ ...s, materials: o }))}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-green-500" />
                    Materiais ({result.materials_list.length})
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sections.materials ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-2">
                  {Object.entries(materialsByCategory).map(([cat, items]) => (
                    <div key={cat}>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                        {CATEGORY_LABELS[cat] || cat}
                      </p>
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[10px] py-1 px-2">Material</TableHead>
                              <TableHead className="text-[10px] py-1 px-2 text-right w-20">Qtd</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((mat, i) => (
                              <TableRow key={i}>
                                <TableCell className="py-1 px-2">
                                  <p className="text-[11px] font-medium">{mat.name}</p>
                                  {mat.specification && (
                                    <p className="text-[9px] text-muted-foreground">{mat.specification}</p>
                                  )}
                                  {mat.notes && (
                                    <p className="text-[9px] text-muted-foreground italic">{mat.notes}</p>
                                  )}
                                </TableCell>
                                <TableCell className="py-1 px-2 text-right text-[11px] font-semibold">
                                  {mat.quantity} {mat.unit}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Collapsible
                open={sections.recommendations}
                onOpenChange={(o) => setSections((s) => ({ ...s, recommendations: o }))}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium py-1">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    Recomendações ({result.recommendations.length})
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sections.recommendations ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1">
                  {result.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 rounded-lg p-2 ${
                        rec.type === "alert"
                          ? "bg-destructive/10"
                          : rec.type === "warning"
                            ? "bg-amber-50 dark:bg-amber-950/30"
                            : "bg-blue-50 dark:bg-blue-950/30"
                      }`}
                    >
                      {rec.type === "alert" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                      ) : rec.type === "warning" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      )}
                      <p className="text-[10px]">{rec.message}</p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Re-analyze */}
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
                <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              )}
              Reanalisar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
