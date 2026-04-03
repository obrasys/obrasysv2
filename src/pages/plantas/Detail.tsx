import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { PlanViewer } from "@/components/plantas/PlanViewer";
import { PlanCalibrationTool } from "@/components/plantas/PlanCalibrationTool";
import { PlanMeasurementToolbar } from "@/components/plantas/PlanMeasurementToolbar";
import type { MeasureMode } from "@/components/plantas/PlanMeasurementToolbar";
import { PlanMeasurementsList } from "@/components/plantas/PlanMeasurementsList";
import { PlanRoomsList } from "@/components/plantas/PlanRoomsList";
import { PlanWallsList } from "@/components/plantas/PlanWallsList";
import { PlanAIAnalysis } from "@/components/plantas/PlanAIAnalysis";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { ArrowLeft, FileText, Image, Loader2, Table2, Minus, Pentagon, Hash, SquareDashed, Wallpaper } from "lucide-react";
import { usePlanImports } from "@/hooks/usePlanImports";
import { usePlanCalibration } from "@/hooks/usePlanCalibration";
import { usePlanMeasurements, calculateLineLength, calculatePolygonArea } from "@/hooks/usePlanMeasurements";
import { usePlanRooms } from "@/hooks/usePlanRooms";
import { usePlanWalls } from "@/hooks/usePlanWalls";
import { usePlanOpenings } from "@/hooks/usePlanOpenings";
import { usePdfRenderer } from "@/hooks/usePdfRenderer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CAMADA_OPTIONS } from "@/types/plan-measurements";
import { toast } from "sonner";

const MEASUREMENT_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function PlanDetail() {
  const { id: obraId, planId } = useParams<{ id: string; planId: string }>();
  const navigate = useNavigate();

  // Data
  const { plans, isLoading: plansLoading } = usePlanImports(obraId);
  const plan = plans.find((p) => p.id === planId);
  const { calibration, saveCalibration } = usePlanCalibration(planId);
  const { measurements, addMeasurement, updateMeasurement, deleteMeasurement } = usePlanMeasurements(planId);
  const { rooms, addRoom, updateRoom, deleteRoom } = usePlanRooms(planId);
  const { walls, addWall, updateWall, deleteWall } = usePlanWalls(planId);
  const { openings, addOpening, deleteOpening } = usePlanOpenings(planId);

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
  const [currentPage, setCurrentPage] = useState(1);
  const { dimensions, isRendering, imageDataUrl, totalPages } = usePdfRenderer({
    url: isPdf ? fileUrlQuery.data ?? null : null,
    page: currentPage,
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
  const [mode, setMode] = useState<MeasureMode>("view");
  const [calibrationPoints, setCalibrationPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [activePoints, setActivePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [colorIndex, setColorIndex] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();

  // Save measurement dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ tipo: "linha" | "area" | "contagem"; coordinates: Array<{ x: number; y: number }>; valor: number } | null>(null);
  const [saveEtiqueta, setSaveEtiqueta] = useState("");
  const [saveCamada, setSaveCamada] = useState("");

  // Save room dialog
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [pendingRoomCoords, setPendingRoomCoords] = useState<Array<{ x: number; y: number }>>([]);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("habitacao");

  // Save wall dialog
  const [showWallDialog, setShowWallDialog] = useState(false);
  const [pendingWallPoints, setPendingWallPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [wallEspessura, setWallEspessura] = useState("15");
  const [wallTipo, setWallTipo] = useState("interior_divisoria");
  const [wallMaterial, setWallMaterial] = useState("alvenaria");

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

  // Unified mode change
  const handleModeChange = (newMode: MeasureMode) => {
    if (newMode !== mode) {
      setActivePoints([]);
      setMode(newMode);
    }
  };

  // Click handler – routes to correct logic based on mode
  const handleCanvasClick = useCallback((point: { x: number; y: number }) => {
    if (mode === "calibrate") {
      handleCalibrationClick(point);
      return;
    }

    if (mode === "measure_count") {
      setPendingSave({ tipo: "contagem", coordinates: [point], valor: 1 });
      setShowSaveDialog(true);
      return;
    }

    if (mode === "measure_line" || mode === "measure_area" || mode === "draw_room") {
      setActivePoints((prev) => [...prev, point]);
      return;
    }

    if (mode === "draw_wall") {
      setActivePoints((prev) => {
        const next = [...prev, point];
        if (next.length === 2) {
          // Auto-complete wall with 2 points
          setPendingWallPoints(next);
          setShowWallDialog(true);
          return [];
        }
        return next;
      });
      return;
    }
  }, [mode, handleCalibrationClick]);

  // Complete handler (double-click)
  const handleCanvasComplete = useCallback(() => {
    if (mode === "measure_line" && activePoints.length >= 2 && pixelsPerMeter > 0) {
      const length = calculateLineLength(activePoints, pixelsPerMeter);
      setPendingSave({ tipo: "linha", coordinates: [...activePoints], valor: length });
      setShowSaveDialog(true);
    } else if (mode === "measure_area" && activePoints.length >= 3 && pixelsPerMeter > 0) {
      const area = calculatePolygonArea(activePoints, pixelsPerMeter);
      setPendingSave({ tipo: "area", coordinates: [...activePoints], valor: area });
      setShowSaveDialog(true);
    } else if (mode === "draw_room" && activePoints.length >= 3) {
      setPendingRoomCoords([...activePoints]);
      setShowRoomDialog(true);
    }
  }, [mode, activePoints, pixelsPerMeter]);

  // Save measurement
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
    toast.success(`Medição guardada`);
  };

  const handleCancelSave = () => {
    setShowSaveDialog(false);
    setPendingSave(null);
    setSaveEtiqueta("");
    setSaveCamada("");
    setActivePoints([]);
  };

  // Save room
  const handleConfirmRoom = async () => {
    if (pendingRoomCoords.length < 3 || !roomName.trim()) return;
    await addRoom.mutateAsync({
      nome: roomName.trim(),
      tipo_compartimento: roomType as any,
      boundary_coords: pendingRoomCoords,
    });
    setActivePoints([]);
    setPendingRoomCoords([]);
    setShowRoomDialog(false);
    setRoomName("");
    setRoomType("habitacao");
  };

  const handleCancelRoom = () => {
    setShowRoomDialog(false);
    setPendingRoomCoords([]);
    setRoomName("");
    setRoomType("habitacao");
    setActivePoints([]);
  };

  // Save wall
  const handleConfirmWall = async () => {
    if (pendingWallPoints.length !== 2 || pixelsPerMeter <= 0) return;
    const dx = pendingWallPoints[1].x - pendingWallPoints[0].x;
    const dy = pendingWallPoints[1].y - pendingWallPoints[0].y;
    const lengthPx = Math.sqrt(dx * dx + dy * dy);
    const lengthM = lengthPx / pixelsPerMeter;
    await addWall.mutateAsync({
      start_point: pendingWallPoints[0],
      end_point: pendingWallPoints[1],
      comprimento_m: parseFloat(lengthM.toFixed(3)),
      espessura_cm: parseFloat(wallEspessura) || 15,
      tipo_funcional: wallTipo as any,
      material: wallMaterial as any,
      room_id: selectedRoomId,
    });
    setPendingWallPoints([]);
    setShowWallDialog(false);
    setWallEspessura("15");
    setWallTipo("interior_divisoria");
    setWallMaterial("alvenaria");
  };

  const handleCancelWall = () => {
    setShowWallDialog(false);
    setPendingWallPoints([]);
    setWallEspessura("15");
    setWallTipo("interior_divisoria");
    setWallMaterial("alvenaria");
  };

  const handleUndo = () => setActivePoints((prev) => prev.slice(0, -1));

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

  // Summary bar stats
  const totalLinhas = measurements.filter((m) => m.tipo === "linha").reduce((s, m) => s + m.valor_bruto, 0);
  const totalAreas = measurements.filter((m) => m.tipo === "area").reduce((s, m) => s + m.valor_bruto, 0);
  const totalRoomsArea = rooms.reduce((s, r) => s + r.area_m2, 0);

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

        {/* Summary bar */}
        {(measurements.length > 0 || rooms.length > 0 || walls.length > 0) && (
          <div className="flex items-center gap-4 px-3 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            {measurements.length > 0 && (
              <span className="flex items-center gap-1">
                <Minus className="w-3 h-3" /> {measurements.length} medições
              </span>
            )}
            {totalAreas > 0 && (
              <span className="flex items-center gap-1">
                <Pentagon className="w-3 h-3" /> {totalAreas.toFixed(2)} m²
              </span>
            )}
            {rooms.length > 0 && (
              <span className="flex items-center gap-1">
                <SquareDashed className="w-3 h-3" /> {rooms.length} comp. ({totalRoomsArea.toFixed(2)} m²)
              </span>
            )}
            {walls.length > 0 && (
              <span className="flex items-center gap-1">
                <Wallpaper className="w-3 h-3" /> {walls.length} paredes
              </span>
            )}
          </div>
        )}

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <PlanViewer
            imageDataUrl={effectiveImageUrl}
            dimensions={effectiveDimensions}
            isRendering={isRendering || imageQuery.isLoading}
            mode={mode}
            calibrationPoints={calibrationPoints}
            onCalibrationClick={() => {}}
            measurements={measurements.map((m) => ({
              id: m.id,
              tipo: m.tipo,
              coordinates: m.coordinates as Array<{ x: number; y: number }>,
              cor: m.cor,
              etiqueta: m.etiqueta ?? undefined,
              valor_bruto: m.valor_bruto,
              unidade: m.unidade,
            }))}
            rooms={rooms.map((r) => ({
              id: r.id,
              nome: r.nome,
              boundary_coords: r.boundary_coords,
              area_m2: r.area_m2,
            }))}
            walls={walls.map((w) => ({
              id: w.id,
              start_point: w.start_point,
              end_point: w.end_point,
              espessura_cm: w.espessura_cm,
              comprimento_m: w.comprimento_m,
            }))}
            selectedRoomId={selectedRoomId}
            onMeasurementClick={handleCanvasClick}
            onMeasurementComplete={handleCanvasComplete}
            activeMeasurementPoints={activePoints}
            pixelsPerMeter={pixelsPerMeter}
            currentPage={currentPage}
            totalPages={isPdf ? totalPages : 1}
            onPageChange={setCurrentPage}
          />

          {/* Side panel */}
          <div className="space-y-4">
            <PlanAIAnalysis
              imageDataUrl={effectiveImageUrl}
              calibration={calibration ? {
                pixels_per_meter: calibration.pixels_per_meter,
                real_distance: calibration.real_distance,
                unidade: calibration.unidade,
              } : null}
              onConvertDimensions={(dims) => {
                if (!calibration) {
                  toast.error("Calibre a planta antes de converter cotas em medições.");
                  return;
                }
                let created = 0;
                dims.forEach((dim) => {
                  const valueInMeters = dim.unit === "cm" ? dim.value / 100
                    : dim.unit === "mm" ? dim.value / 1000
                    : dim.value;
                  addMeasurement.mutate({
                    tipo: "linha",
                    coordinates: [
                      { x: dim.position_x * 1000, y: dim.position_y * 1000 },
                      { x: dim.position_x * 1000 + valueInMeters * calibration.pixels_per_meter, y: dim.position_y * 1000 },
                    ],
                    valorBruto: valueInMeters,
                    unidade: "m",
                    etiqueta: dim.label,
                    cor: "#f59e0b",
                    observacao: `OCR (confiança ${Math.round(dim.confidence * 100)}%)`,
                  }, {
                    onSuccess: () => {
                      created++;
                      if (created === dims.length) {
                        toast.success(`${created} medição(ões) criadas a partir de cotas OCR (pendentes de validação)`);
                      }
                    },
                  });
                });
              }}
            />
            <PlanCalibrationTool
              points={calibrationPoints}
              isCalibrating={mode === "calibrate"}
              onStartCalibration={handleStartCalibration}
              onSaveCalibration={handleSaveCalibration}
              onReset={handleResetCalibration}
              currentCalibration={calibration}
              isSaving={saveCalibration.isPending}
            />

            <Tabs defaultValue="measurements" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="measurements" className="text-xs gap-1">
                  <Minus className="w-3 h-3" /> Medições
                </TabsTrigger>
                <TabsTrigger value="rooms" className="text-xs gap-1">
                  <SquareDashed className="w-3 h-3" /> Comp.
                </TabsTrigger>
                <TabsTrigger value="walls" className="text-xs gap-1">
                  <Wallpaper className="w-3 h-3" /> Paredes
                </TabsTrigger>
              </TabsList>
              <TabsContent value="measurements" className="mt-2">
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
              </TabsContent>
              <TabsContent value="rooms" className="mt-2">
                <PlanRoomsList
                  rooms={rooms}
                  selectedRoomId={selectedRoomId}
                  onSelectRoom={setSelectedRoomId}
                  onDelete={(id) => deleteRoom.mutate(id)}
                  onUpdate={(id, updates) => updateRoom.mutate({ id, ...updates } as any)}
                />
              </TabsContent>
              <TabsContent value="walls" className="mt-2">
                <PlanWallsList
                  walls={walls}
                  openings={openings}
                  rooms={rooms}
                  onDeleteWall={(id) => deleteWall.mutate(id)}
                  onUpdateWall={(id, updates) => updateWall.mutate({ id, ...updates } as any)}
                  onAddOpening={(data) => addOpening.mutate(data as any)}
                  onDeleteOpening={(id) => deleteOpening.mutate(id)}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Save measurement dialog */}
      <Dialog open={showSaveDialog} onOpenChange={(open) => !open && handleCancelSave()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {pendingSave?.tipo === "linha" ? "Guardar Medição de Linha" : pendingSave?.tipo === "area" ? "Guardar Medição de Área" : "Guardar Contagem"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {pendingSave?.valor.toFixed(pendingSave.tipo === "contagem" ? 0 : 2)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {pendingSave?.tipo === "contagem" ? "un" : pendingSave?.tipo === "area" ? "m²" : "m"}
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Etiqueta (opcional)</Label>
              <Input value={saveEtiqueta} onChange={(e) => setSaveEtiqueta(e.target.value)} placeholder="Ex: Parede sala, Tomadas quarto..." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Camada</Label>
              <Select value={saveCamada} onValueChange={setSaveCamada}>
                <SelectTrigger><SelectValue placeholder="Selecionar camada..." /></SelectTrigger>
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

      {/* Save room dialog */}
      <Dialog open={showRoomDialog} onOpenChange={(open) => !open && handleCancelRoom()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Guardar Compartimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted rounded-lg p-3 text-center text-xs text-muted-foreground">
              Polígono com {pendingRoomCoords.length} vértices
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Nome do Compartimento *</Label>
              <Input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Ex: Sala, Cozinha, WC1..."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tipo</Label>
              <Select value={roomType} onValueChange={setRoomType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="habitacao">Habitação</SelectItem>
                  <SelectItem value="servico">Serviço</SelectItem>
                  <SelectItem value="circulacao">Circulação</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelRoom}>Cancelar</Button>
            <Button onClick={handleConfirmRoom} disabled={!roomName.trim() || addRoom.isPending}>
              {addRoom.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save wall dialog */}
      <Dialog open={showWallDialog} onOpenChange={(open) => !open && handleCancelWall()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Guardar Parede</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {pixelsPerMeter > 0 && pendingWallPoints.length === 2 && (
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {(Math.sqrt(
                    Math.pow(pendingWallPoints[1].x - pendingWallPoints[0].x, 2) +
                    Math.pow(pendingWallPoints[1].y - pendingWallPoints[0].y, 2)
                  ) / pixelsPerMeter).toFixed(2)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">m</span>
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Espessura (cm)</Label>
                <Input value={wallEspessura} onChange={(e) => setWallEspessura(e.target.value)} type="number" step="1" className="h-8 text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tipo</Label>
                <Select value={wallTipo} onValueChange={setWallTipo}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exterior">Exterior</SelectItem>
                    <SelectItem value="interior_divisoria">Interior Divisória</SelectItem>
                    <SelectItem value="interior_estrutural">Interior Estrutural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Material</Label>
              <Select value={wallMaterial} onValueChange={setWallMaterial}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alvenaria">Alvenaria</SelectItem>
                  <SelectItem value="betao">Betão</SelectItem>
                  <SelectItem value="gesso_cartonado">Gesso Cartonado</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelWall}>Cancelar</Button>
            <Button onClick={handleConfirmWall} disabled={addWall.isPending}>
              {addWall.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
