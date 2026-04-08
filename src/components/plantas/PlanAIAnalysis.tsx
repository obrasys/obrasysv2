import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlanAnalysisResult {
  scale_detected: {
    found: boolean;
    value?: string;
    reference_dimension?: string;
  };
  dimensions: Array<{
    value: number;
    unit: string;
    label: string;
    position_x: number;
    position_y: number;
    confidence: number;
  }>;
  rooms: Array<{
    name: string;
    estimated_area?: number;
    center_x: number;
    center_y: number;
    confidence: number;
  }>;
  elements: Array<{
    type: string;
    label: string;
    position_x: number;
    position_y: number;
    count?: number;
  }>;
  summary: string;
}

interface PlanAIAnalysisProps {
  imageDataUrl: string | null;
  calibration: {
    pixels_per_meter: number;
    real_distance: number;
    unidade: string;
  } | null;
  onHighlightPosition?: (x: number, y: number) => void;
  onConvertDimensions?: (dimensions: Array<{
    value: number;
    unit: string;
    label: string;
    position_x: number;
    position_y: number;
    confidence: number;
  }>) => void;
  onAnalysisComplete?: () => void;
}

export function PlanAIAnalysis({ imageDataUrl, calibration, onHighlightPosition, onConvertDimensions }: PlanAIAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PlanAnalysisResult | null>(null);
  const [sectionsOpen, setSectionsOpen] = useState({
    dimensions: true,
    rooms: true,
    elements: false,
  });

  const handleAnalyze = async () => {
    if (!imageDataUrl) {
      toast.error("Nenhuma planta carregada");
      return;
    }

    setIsAnalyzing(true);
    try {
      // Convert image to base64
      let base64: string;
      if (imageDataUrl.startsWith("data:")) {
        base64 = imageDataUrl.split(",")[1];
      } else {
        // Fetch and convert
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(blob);
        });
      }

      const { data, error } = await supabase.functions.invoke("axia-plan-vision", {
        body: {
          image_base64: base64,
          calibration_info: calibration,
        },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error === "Rate limit exceeded") {
          toast.error("Limite de pedidos atingido. Tente novamente em breve.");
        } else if (data.error === "Credits exhausted") {
          toast.error("Créditos de IA esgotados.");
        } else {
          throw new Error(data.error);
        }
        return;
      }

      if (data?.analysis) {
        setResult(data.analysis);
        const dimCount = data.analysis.dimensions?.length ?? 0;
        const roomCount = data.analysis.rooms?.length ?? 0;
        toast.success(`Análise concluída: ${dimCount} cotas, ${roomCount} compartimentos identificados`);
      } else {
        toast.warning("A IA não conseguiu analisar esta planta.");
      }
    } catch (err: any) {
      console.error("AI analysis error:", err);
      toast.error("Erro na análise: " + (err.message || "erro desconhecido"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const confidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return <Badge variant="default" className="text-[9px] px-1">Alta</Badge>;
    if (confidence >= 0.5) return <Badge variant="secondary" className="text-[9px] px-1">Média</Badge>;
    return <Badge variant="outline" className="text-[9px] px-1">Baixa</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4" style={{ color: "#00679d" }} />
          <span style={{ color: "#00679d" }}>Axia™</span> Análise Visual
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
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3 pr-2">
              {/* Summary */}
              <div className="bg-muted rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">{result.summary}</p>
              </div>

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
                    {result.dimensions.map((dim, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => onHighlightPosition?.(dim.position_x, dim.position_y)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {dim.value} {dim.unit}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{dim.label}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {confidenceBadge(dim.confidence)}
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
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
                    {result.rooms.map((room, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => onHighlightPosition?.(room.center_x, room.center_y)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{room.name}</p>
                          {room.estimated_area && (
                            <p className="text-[10px] text-muted-foreground">
                              ≈ {room.estimated_area.toFixed(1)} m²
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {confidenceBadge(room.confidence)}
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
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
                    {result.elements.map((el, i) => (
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
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* No scale warning */}
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
                Reanalisar
              </Button>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
