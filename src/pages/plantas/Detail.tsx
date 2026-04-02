import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { PlanViewer } from "@/components/plantas/PlanViewer";
import { PlanCalibrationTool } from "@/components/plantas/PlanCalibrationTool";
import { PlanMeasurementToolbar } from "@/components/plantas/PlanMeasurementToolbar";
import { PlanMeasurementsList } from "@/components/plantas/PlanMeasurementsList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { ArrowLeft, FileText, Image, Loader2, Table2 } from "lucide-react";
import { usePlanImports } from "@/hooks/usePlanImports";
import { usePlanCalibration } from "@/hooks/usePlanCalibration";
import { usePlanMeasurements, calculateLineLength, calculatePolygonArea } from "@/hooks/usePlanMeasurements";
import { usePdfRenderer } from "@/hooks/usePdfRenderer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CAMADA_OPTIONS } from "@/types/plan-measurements";
import { toast } from "sonner";

type ViewMode = "view" | "calibrate" | "measure_line" | "measure_area" | "measure_count";

const MEASUREMENT_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function PlanDetail() {
  const { id: obraId, planId } = useParams<{ id: string; planId: string }>();
  const navigate = useNavigate();

  // Data
  const { plans, isLoading: plansLoading } = usePlanImports(obraId);
  const plan = plans.find((p) => p.id === planId);
  const { calibration, saveCalibration } = usePlanCalibration(planId);
  const { measurements, addMeasurement, updateMeasurement, deleteMeasurement } = usePlanMeasurements(planId);

  // File URL
  const fileUrlQuery = useQuery({
    queryKey: ["plan-file-url", plan?.file_path],
    queryFn: async () => {
      if (!plan?.file_path) return null;
      const { data } = await supabase.storage.from("plan-files").createSignedUrl(plan.file_path, 3600);
      return data?.signedUrl ?? null;
    },
    enabled: !!plan?.file_path,
  });

  // PDF renderer
  const isPdf = plan?.file_type === "pdf";
  const { dimensions, isRendering, imageDataUrl } = usePdfRenderer({
    url: isPdf ? fileUrlQuery.data ?? null : null,
  });

  // Image loader for non-PDF
  const imageQuery = useQuery({
    queryKey: ["plan-image-dim", fileUrlQuery.data, isPdf],
    queryFn: () =>
      new Promise<{ width: number; height: number; dataUrl: string }>((resolve) => {
        const url = fileUrlQuery.data;
        if (!url) return resolve({ width: 0, height: 0, dataUrl: "" });
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve({ width: img.width, height: img.height, dataUrl: url });
        img.src = url;
      }),
    enabled: !!fileUrlQuery.data && !isPdf,
  });

  const effectiveImageUrl = isPdf ? imageDataUrl : imageQuery.data?.dataUrl ?? null;
  const effectiveDimensions = isPdf ? dimensions : { width: imageQuery.data?.width ?? 0, height: imageQuery.data?.height ?? 0 };

  // Mode state
  const [mode, setMode] = useState<ViewMode>("view");
  const [calibrationPoints, setCalibrationPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [activePoints, setActivePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [colorIndex, setColorIndex] = useState(0);

  // Save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ tipo: "linha" | "area" | "contagem"; coordinates: Array<{ x: number; y: number }>; valor: number } | null>(null);
  const [saveEtiqueta, setSaveEtiqueta] = useState("");
  const [saveCamada, setSaveCamada] = useState("");

  const canMeasure = !!calibration && calibration.status === "valida";
  const pixelsPerMeter = calibration?.pixels_per_meter ?? 0;

  // Calibration handlers
  const handleCalibrationClick = useCallback((point: { x: number; y: number }) => {
    if (calibrationPoints.length < 2) setCalibrationPoints((prev) => [...prev, point]);
  }, [calibrationPoints.length]);

  const handleStartCalibration = () => { setMode("calibrate"); setCalibrationPoints([]); };
  const handleResetCalibration = () => { setMode("view"); setCalibrationPoints([]); };
  const handleSaveCalibration = async (realDistance: number, unidade: string) => {
    if (calibrationPoints.length !== 2) return;
    await saveCalibration.mutateAsync({ point1: calibrationPoints[0], point2: calibrationPoints[1], realDistance, unidade });
    setMode("view");
    setCalibrationPoints([]);
  };

  // Measurement handlers
  const handleModeChange = (newMode: ViewMode) => {
    if (newMode !== mode) {
      setActivePoints([]);
      setMode(newMode);
    }
  };

  const handleMeasurementClick = useCallback((point: { x: number; y: number }) => {
    if (mode === "measure_count") {
      const coords = [point];
      setPendingSave({ tipo: "contagem", coordinates: coords, valor: 1 });
      setShowSaveDialog(true);
    } else if (mode === "measure_line" || mode === "measure_area") {
      setActivePoints((prev) => [...prev, point]);
    }
  }, [mode]);

  const handleMeasurementComplete = useCallback(() => {
    if (mode === "measure_line" && activePoints.length >= 2 && pixelsPerMeter > 0) {
      const length = calculateLineLength(activePoints, pixelsPerMeter);
      setPendingSave({ tipo: "linha", coordinates: [...activePoints], valor: length });
      setShowSaveDialog(true);
    } else if (mode === "measure_area" && activePoints.length >= 3 && pixelsPerMeter > 0) {
      const area = calculatePolygonArea(activePoints, pixelsPerMeter);
      setPendingSave({ tipo: "area", coordinates: [...activePoints], valor: area });
      setShowSaveDialog(true);
    }
  }, [mode, activePoints, pixelsPerMeter]);

  const handleConfirmSave = async () => {
    if (!pendingSave) return;
    const cor = MEASUREMENT_COLORS[colorIndex % MEASUREMENT_COLORS.length];
    await addMeasurement.mutateAsync({
      tipo: pendingSave.tipo,
      coordinates: pendingSave.coordinates,
      valorBruto: parseFloat(pendingSave.valor.toFixed(4)),
      unidade: pendingSave.tipo === "contagem" ? "un" : pendingSave.tipo === "area" ? "m²" : "m",
      camada: saveCamada || undefined,
      etiqueta: saveEtiqueta || undefined,
      cor,
    });
    setColorIndex((i) => i + 1);
    setActivePoints([]);
    setPendingSave(null);
    setShowSaveDialog(false);
    setSaveEtiqueta("");
    setSaveCamada("");
    toast.success(`Medição guardada: ${pendingSave.valor.toFixed(pendingSave.tipo === "contagem" ? 0 : 2)} ${pendingSave.tipo === "contagem" ? "un" : "m"}`);
  };

  const handleCancelSave = () => {
    setShowSaveDialog(false);
    setPendingSave(null);
    setSaveEtiqueta("");
    setSaveCamada("");
    if (mode === "measure_line") setActivePoints([]);
  };

  const handleUndo = () => {
    setActivePoints((prev) => prev.slice(0, -1));
  };

  // Loading states
  if (plansLoading || fileUrlQuery.isLoading) {
    return (
      <AppLayout title="Planta">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!plan) {
    return (
      <AppLayout title="Planta não encontrada">
        <div className="text-center py-16">
          <p className="text-muted-foreground">Planta não encontrada.</p>
          <Button className="mt-4" onClick={() => navigate(`/obras/${obraId}/plantas`)}>Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={plan.nome_ficheiro} subtitle={`Rev. ${plan.revision_number}`}>
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/obras/${obraId}/plantas`)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Plantas
            </Button>
            <div className="flex items-center gap-2">
              {isPdf ? <FileText className="w-4 h-4 text-destructive" /> : <Image className="w-4 h-4 text-primary" />}
              <span className="text-sm font-medium">{plan.nome_ficheiro}</span>
              <Badge variant="secondary" className="text-[10px]">Rev. {plan.revision_number}</Badge>
            </div>
          </div>

          {/* Measurement toolbar */}
          <div className="flex items-center gap-2">
            <PlanMeasurementToolbar
              mode={mode === "calibrate" ? "view" : mode}
              onModeChange={handleModeChange}
              canMeasure={canMeasure}
              onUndo={handleUndo}
              hasActivePoints={activePoints.length > 0}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={measurements.length === 0}
                  onClick={() => navigate(`/obras/${obraId}/plantas/${planId}/quantitativos`)}
                >
                  <Table2 className="w-4 h-4 mr-1" />
                  Quantitativos
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mapear medições para artigos</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          <PlanViewer
            imageDataUrl={effectiveImageUrl}
            dimensions={effectiveDimensions}
            isRendering={isRendering || imageQuery.isLoading}
            mode={mode}
            calibrationPoints={calibrationPoints}
            onCalibrationClick={handleCalibrationClick}
            measurements={measurements.map((m) => ({
              id: m.id,
              tipo: m.tipo,
              coordinates: m.coordinates as Array<{ x: number; y: number }>,
              cor: m.cor,
              etiqueta: m.etiqueta ?? undefined,
              valor_bruto: m.valor_bruto,
              unidade: m.unidade,
            }))}
            onMeasurementClick={handleMeasurementClick}
            onMeasurementComplete={handleMeasurementComplete}
            activeMeasurementPoints={activePoints}
            pixelsPerMeter={pixelsPerMeter}
          />

          {/* Side panel */}
          <div className="space-y-4">
            <PlanCalibrationTool
              points={calibrationPoints}
              isCalibrating={mode === "calibrate"}
              onStartCalibration={handleStartCalibration}
              onSaveCalibration={handleSaveCalibration}
              onReset={handleResetCalibration}
              currentCalibration={calibration}
              isSaving={saveCalibration.isPending}
            />
            <PlanMeasurementsList
              measurements={measurements}
              onDelete={(id) => deleteMeasurement.mutate(id)}
              onUpdate={(id, updates) =>
                updateMeasurement.mutate({
                  id,
                  etiqueta: updates.etiqueta,
                  camada: updates.camada as any,
                  estadoValidacao: updates.estado_validacao as any,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Save measurement dialog */}
      <Dialog open={showSaveDialog} onOpenChange={(open) => !open && handleCancelSave()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {pendingSave?.tipo === "linha" ? "Guardar Medição de Linha" : "Guardar Contagem"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {pendingSave?.valor.toFixed(pendingSave.tipo === "contagem" ? 0 : 2)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {pendingSave?.tipo === "contagem" ? "un" : "m"}
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Etiqueta (opcional)</Label>
              <Input
                value={saveEtiqueta}
                onChange={(e) => setSaveEtiqueta(e.target.value)}
                placeholder="Ex: Parede sala, Tomadas quarto..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Camada</Label>
              <Select value={saveCamada} onValueChange={setSaveCamada}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar camada..." />
                </SelectTrigger>
                <SelectContent>
                  {CAMADA_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelSave}>Cancelar</Button>
            <Button onClick={handleConfirmSave} disabled={addMeasurement.isPending}>
              {addMeasurement.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
