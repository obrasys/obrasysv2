import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { PlanViewer } from "@/components/plantas/PlanViewer";
import { PlanCalibrationTool } from "@/components/plantas/PlanCalibrationTool";
import type { MeasureMode } from "@/components/plantas/PlanMeasurementToolbar";
import { PlanMeasurementsList } from "@/components/plantas/PlanMeasurementsList";
import { PlanRoomsList } from "@/components/plantas/PlanRoomsList";
import { PlanWallsList } from "@/components/plantas/PlanWallsList";
import { PlanAIAnalysis, type PlanAnalysisResult } from "@/components/plantas/PlanAIAnalysis";
import { PlanUploadForm } from "@/components/plantas/PlanUploadForm";
import { PlanWorkflowBar, type WorkflowStep } from "@/components/plantas/PlanWorkflowBar";
import { PlanSymbolPicker } from "@/components/plantas/PlanSymbolPicker";
import { PlanGripPreferences } from "@/components/plantas/PlanGripPreferences";
import { PlanElementProperties } from "@/components/plantas/PlanElementProperties";
import { PlanSegmentDialog, type SegmentSavePayload, type SegmentInitialValues } from "@/components/plantas/PlanSegmentDialog";
import { PlanMeasurementBudgetPanel } from "@/components/plantas/PlanMeasurementBudgetPanel";
import { PlanMeasurementAxiaPanel, PlanAxiaSummaryStrip } from "@/components/plantas/PlanMeasurementAxiaPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { ArrowLeft, FileText, Image, Loader2, Table2, Minus, Pentagon, Hash, SquareDashed, Wallpaper, Plug, Upload } from "lucide-react";
import { usePlanImports } from "@/hooks/usePlanImports";
import { usePlanCalibration } from "@/hooks/usePlanCalibration";
import { usePlanMeasurements, calculateLineLength, calculatePolygonArea, calculatePolygonPerimeter } from "@/hooks/usePlanMeasurements";
import { usePlanRooms } from "@/hooks/usePlanRooms";
import { usePlanWalls } from "@/hooks/usePlanWalls";
import { usePlanOpenings } from "@/hooks/usePlanOpenings";
import { usePdfRenderer } from "@/hooks/usePdfRenderer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CAMADA_OPTIONS } from "@/types/plan-measurements";
import { toast } from "sonner";
import { getSymbolById, type PlacedPlantElement, type PlantSymbolType, type ActiveInsertTool } from "@/types/plan-symbols";
import { usePlanPlacedElements } from "@/hooks/usePlanPlacedElements";
import { PlanElementsExportBudget } from "@/components/plantas/PlanElementsExportBudget";
import { PlanElectricalAnalysis } from "@/components/plantas/PlanElectricalAnalysis";
import { AxiaGuidedMode } from "@/components/plantas/AxiaGuidedMode";
import { PlanFloorSelector } from "@/components/plantas/PlanFloorSelector";
import { usePlanFloors } from "@/hooks/usePlanFloors";
import { usePlanAxiaPersistence } from "@/hooks/usePlanAxiaPersistence";
import { computePlanRoomAnalysis, analysisFromAxiaResult } from "@/lib/plan-room-analysis";
import { PlanAnalysisParametersCard } from "@/components/plantas/PlanAnalysisParametersCard";
import { PlanRoomBreakdownTable } from "@/components/plantas/PlanRoomBreakdownTable";
import { PlanGlobalQuantityTable } from "@/components/plantas/PlanGlobalQuantityTable";
import { disciplineScope, DISCIPLINE_META } from "@/lib/plan-discipline";

const MEASUREMENT_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function PlanDetail() {
  const { id: obraId, planId } = useParams<{ id: string; planId: string }>();
  const navigate = useNavigate();

  // Data
  const { plans, isLoading: plansLoading, uploadPlan } = usePlanImports(obraId);
  const plan = plans.find((p) => p.id === planId);
  const scope = disciplineScope((plan as any)?.disciplina);
  const disciplineMeta = (plan as any)?.disciplina ? DISCIPLINE_META[(plan as any).disciplina as keyof typeof DISCIPLINE_META] : null;
  // Axia persistence (DB-backed, com fallback localStorage)
  const axiaPersist = usePlanAxiaPersistence(planId);
  // calibration declared below (depends on currentPage / pageId)
  const { measurements, addMeasurement, updateMeasurement, deleteMeasurement } = usePlanMeasurements(planId);
  const { rooms, addRoom, updateRoom, deleteRoom } = usePlanRooms(planId);
  const { walls, addWall, updateWall, deleteWall } = usePlanWalls(planId);
  const { openings, addOpening, deleteOpening } = usePlanOpenings(planId);
  const { floors } = usePlanFloors(obraId);

  // Axia analysis parameters (ceiling height + door height) — persisted per plan in localStorage
  const [analysisParams, setAnalysisParams] = useState<{ ceilingHeightM: number; doorHeightM: number }>(() => {
    if (typeof window === "undefined" || !planId) return { ceilingHeightM: 2.6, doorHeightM: 2.0 };
    try {
      const raw = window.localStorage.getItem(`plan-analysis-params:${planId}`);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { ceilingHeightM: 2.6, doorHeightM: 2.0 };
  });
  useEffect(() => {
    if (typeof window === "undefined" || !planId) return;
    try { window.localStorage.setItem(`plan-analysis-params:${planId}`, JSON.stringify(analysisParams)); } catch { /* ignore */ }
  }, [planId, analysisParams]);

  // Floor selection (used to scope new measurements/rooms; persisted per plan in localStorage)
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(() => {
    if (typeof window === "undefined" || !planId) return null;
    return localStorage.getItem(`plan-floor:${planId}`);
  });
  useEffect(() => {
    if (!planId) return;
    if (selectedFloorId) localStorage.setItem(`plan-floor:${planId}`, selectedFloorId);
    else localStorage.removeItem(`plan-floor:${planId}`);
  }, [selectedFloorId, planId]);

  // Axia Guided Mode (persisted per user)
  const [guidedMode, setGuidedMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("plan-axia-guided") === "1";
  });
  useEffect(() => {
    localStorage.setItem("plan-axia-guided", guidedMode ? "1" : "0");
  }, [guidedMode]);

  // Axia analysis results PER PAGE — fonte de verdade: DB (plan_pages.axia_analysis)
  // Mantemos um espelho local para reagir instantaneamente; persistência é via axiaPersist.saveAnalysis.
  const [axiaResultsByPage, setAxiaResultsByPage] = useState<Record<number, PlanAnalysisResult>>({});
  useEffect(() => {
    // Re-hidrata sempre que a DB devolve novos resultados (ou ao primeiro fetch com fallback localStorage)
    setAxiaResultsByPage(axiaPersist.resultsByPage as Record<number, PlanAnalysisResult>);
  }, [axiaPersist.resultsByPage]);

  // Upload-new-plan dialog
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  // Pending page-jump for "Analisar todas as folhas em falta"
  const [pendingAnalyzeQueue, setPendingAnalyzeQueue] = useState<number[]>([]);
  const [autoAnalyzeToken, setAutoAnalyzeToken] = useState(0);

  // Advance queue when the current page becomes analyzed
  useEffect(() => {
    if (pendingAnalyzeQueue.length === 0) return;
    const [head, ...rest] = pendingAnalyzeQueue;
    if (axiaResultsByPage[head]) {
      if (rest.length > 0) {
        setPendingAnalyzeQueue(rest);
        setCurrentPage(rest[0]);
        setAutoAnalyzeToken((t) => t + 1);
        toast.info(`A analisar folha ${rest[0]}... (${rest.length} restantes)`);
      } else {
        setPendingAnalyzeQueue([]);
        toast.success("Todas as folhas analisadas.");
      }
    }
  }, [axiaResultsByPage, pendingAnalyzeQueue]);

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

  // Calibração escopo: planta + página atual + pavimento selecionado
  const currentPageId = axiaPersist.getPageMetadata(currentPage)?.page_id ?? null;
  const { calibration, isLoading: calibrationLoading, saveCalibration } = usePlanCalibration(planId, currentPageId, selectedFloorId);

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
  const [pendingSave, setPendingSave] = useState<{ tipo: "linha" | "area" | "contagem"; coordinates: Array<{ x: number; y: number }>; valor: number; perimetro?: number } | null>(null);
  const [saveEtiqueta, setSaveEtiqueta] = useState("");
  const [saveCamada, setSaveCamada] = useState("");

  // Wall/openings calculator (only for area-type save)
  const [peDireito, setPeDireito] = useState("2.70");
  type AberturaTipo = "janela" | "porta";
  type AberturaCalc = { id: string; tipo: AberturaTipo; largura: string; altura: string };
  const [aberturas, setAberturas] = useState<AberturaCalc[]>([]);
  const [includeWallsAsMeasurement, setIncludeWallsAsMeasurement] = useState(true);

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

  // Opening (vão) dialog state
  const [showOpeningDialog, setShowOpeningDialog] = useState(false);
  const [pendingOpening, setPendingOpening] = useState<{ wallId: string; x: number; y: number } | null>(null);
  const [openingTipo, setOpeningTipo] = useState("porta");
  const [openingLargura, setOpeningLargura] = useState("0.80");
  const [openingAltura, setOpeningAltura] = useState("2.10");
  const [openingPeitoril, setOpeningPeitoril] = useState("");

  // Segment dialog (parede isolada com ações construtivas)
  const [showSegmentDialog, setShowSegmentDialog] = useState(false);
  const [pendingSegment, setPendingSegment] = useState<{ coordinates: Array<{ x: number; y: number }>; comprimento: number } | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingSegmentInitial, setEditingSegmentInitial] = useState<SegmentInitialValues | null>(null);

  const canMeasure = !calibrationLoading && !!calibration && calibration.status === "valida";
  const pixelsPerMeter = calibration?.pixels_per_meter ?? 0;

  // Element insertion state - persisted via hook
  const { elements: placedElements, addElement, updateElement: updateElementDb, deleteElement: deleteElementDb, deleteLastElement } = usePlanPlacedElements(planId);

  // Compute Axia per-room analysis (overlay + tables).
  // Preferência: rooms desenhados/persistidos. Fallback: resultado vivo da Axia
  // para a página atual (quando o utilizador ainda não converteu em plan_rooms).
  const planRoomAnalysis = useMemo(() => {
    const fromDb = computePlanRoomAnalysis({
      rooms,
      walls,
      openings,
      placedElements,
      pixelsPerMeter,
      ceilingHeightM: analysisParams.ceilingHeightM,
      defaultDoorHeightM: analysisParams.doorHeightM,
    });
    if (fromDb.perRoom.length > 0) return fromDb;
    const axiaResult = axiaResultsByPage[currentPage];
    if (axiaResult && (axiaResult.rooms?.length ?? 0) > 0) {
      return analysisFromAxiaResult(axiaResult as any, {
        ceilingHeightM: analysisParams.ceilingHeightM,
        defaultDoorHeightM: analysisParams.doorHeightM,
      });
    }
    return fromDb;
  }, [rooms, walls, openings, placedElements, pixelsPerMeter, analysisParams.ceilingHeightM, analysisParams.doorHeightM, axiaResultsByPage, currentPage]);

  const [insertTool, setInsertTool] = useState<ActiveInsertTool>({ symbolTypeId: null, mode: "idle", continuous: false, insertedCount: 0 });
  const [selectedElement, setSelectedElement] = useState<PlacedPlantElement | null>(null);
  const [showElementProps, setShowElementProps] = useState(false);

  // ESC key to exit insert mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && insertTool.mode === "inserting") {
        handleInsertCancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [insertTool.mode]);

  // Workflow stepper state — hydrated from plan record so checklist persists across reloads
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("calibrate");
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from DB once the plan loads
  useEffect(() => {
    if (!plan || hydrated) return;
    const persistedStep = (plan as any).workflow_step as WorkflowStep | undefined;
    const persistedAnalysis = (plan as any).has_analysis as boolean | undefined;
    if (persistedStep && ["calibrate", "measure", "analyze", "budget"].includes(persistedStep)) {
      setWorkflowStep(persistedStep);
    }
    if (typeof persistedAnalysis === "boolean") {
      setHasAnalysis(persistedAnalysis);
    }
    setHydrated(true);
  }, [plan, hydrated]);

  // Persist workflow_step + has_analysis to DB (debounced)
  useEffect(() => {
    if (!hydrated || !planId) return;
    const persistedStep = (plan as any)?.workflow_step;
    const persistedAnalysis = (plan as any)?.has_analysis;
    if (persistedStep === workflowStep && persistedAnalysis === hasAnalysis) return;
    const t = setTimeout(() => {
      supabase
        .from("plan_imports")
        .update({ workflow_step: workflowStep, has_analysis: hasAnalysis } as any)
        .eq("id", planId)
        .then(({ error }) => {
          if (error) console.warn("Falha a guardar progresso da planta:", error.message);
        });
    }, 400);
    return () => clearTimeout(t);
  }, [workflowStep, hasAnalysis, hydrated, planId, plan]);

  const completedSteps = useMemo(() => {
    const completed: WorkflowStep[] = [];
    if (canMeasure) completed.push("calibrate");
    if (measurements.length > 0 || rooms.length > 0 || walls.length > 0) completed.push("measure");
    if (hasAnalysis) completed.push("analyze");
    return completed;
  }, [canMeasure, measurements.length, rooms.length, walls.length, hasAnalysis]);

  // Auto-advance workflow step
  const effectiveStep = useMemo(() => {
    if (!canMeasure) return "calibrate";
    if (workflowStep === "calibrate" && canMeasure) return "measure";
    return workflowStep;
  }, [workflowStep, canMeasure]);

  const handleStepClick = (step: WorkflowStep) => {
    setWorkflowStep(step);
    if (step === "calibrate" && !canMeasure) {
      handleStartCalibration();
    }
  };

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
      if (insertTool.mode === "inserting") handleInsertFinish();
      setMode(newMode);
    }
  };

  // Element insertion handlers
  const handleSelectSymbol = (symbol: PlantSymbolType) => {
    setInsertTool({ symbolTypeId: symbol.id, mode: "inserting", continuous: symbol.insertMode === "continuous", insertedCount: 0 });
    setActivePoints([]);
    setMode("insert_element");
    toast.info(`Modo de inserção: ${symbol.name}`);
  };

  const handleInsertFinish = () => {
    if (insertTool.insertedCount > 0) {
      toast.success(`${insertTool.insertedCount} elemento(s) inserido(s)`);
    }
    setInsertTool({ symbolTypeId: null, mode: "idle", continuous: false, insertedCount: 0 });
    setMode("view");
  };

  const handleInsertUndo = () => {
    if (placedElements.length === 0) return;
    deleteLastElement.mutate();
    setInsertTool((prev) => ({ ...prev, insertedCount: Math.max(0, prev.insertedCount - 1) }));
  };

  const handleInsertChangeType = () => {
    // Reset but stay ready — the picker popover will open
    handleInsertFinish();
  };

  const handleInsertCancel = () => {
    setInsertTool({ symbolTypeId: null, mode: "idle", continuous: false, insertedCount: 0 });
    setMode("view");
  };

  const handleElementClick = (el: PlacedPlantElement) => {
    if (mode === "insert_element") return; // Don't open props during insertion
    setSelectedElement(el);
    setShowElementProps(true);
  };

  const handleUpdateElement = (id: string, updates: Partial<PlacedPlantElement>) => {
    updateElementDb.mutate({ id, ...updates });
  };

  const handleDeleteElement = (id: string) => {
    deleteElementDb.mutate(id);
  };

  // Helper: find closest wall to a point and project the point onto the wall segment
  const snapToNearestWall = useCallback((point: { x: number; y: number }) => {
    if (walls.length === 0) return null;
    let best: { wallId: string; px: number; py: number; dist: number } | null = null;
    for (const w of walls) {
      const ax = w.start_point.x;
      const ay = w.start_point.y;
      const bx = w.end_point.x;
      const by = w.end_point.y;
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;
      const t = Math.max(0, Math.min(1, ((point.x - ax) * dx + (point.y - ay) * dy) / len2));
      const px = ax + t * dx;
      const py = ay + t * dy;
      const d = Math.hypot(point.x - px, point.y - py);
      if (!best || d < best.dist) best = { wallId: w.id, px, py, dist: d };
    }
    return best;
  }, [walls]);

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

    if (mode === "draw_opening") {
      const snap = snapToNearestWall(point);
      if (!snap) {
        toast.error("Crie uma parede primeiro para poder inserir um vão.");
        return;
      }
      // Tolerance: ~30 px in image space (covers fingers/touch)
      if (snap.dist > 40) {
        toast.warning("Clique mais próximo de uma parede para inserir o vão.");
        return;
      }
      setPendingOpening({ wallId: snap.wallId, x: snap.px, y: snap.py });
      setShowOpeningDialog(true);
      return;
    }

    // Element insertion mode
    if (mode === "insert_element" && insertTool.symbolTypeId) {
      const sym = getSymbolById(insertTool.symbolTypeId);
      const newEl = {
        id: crypto.randomUUID(),
        symbolTypeId: insertTool.symbolTypeId,
        category: sym?.category ?? "instalacoes",
        subcategory: sym?.subcategory,
        x: point.x,
        y: point.y,
      };
      addElement.mutate(newEl as any);
      setInsertTool((prev) => ({ ...prev, insertedCount: prev.insertedCount + 1 }));
      if (!insertTool.continuous) {
        handleInsertFinish();
      }
      return;
    }
  }, [mode, handleCalibrationClick, insertTool, snapToNearestWall]);

  // Complete handler (double-click)
  const handleCanvasComplete = useCallback(() => {
    if (mode === "measure_line" && pixelsPerMeter > 0) {
      // 2 pontos → segmento de parede isolada (ações construtivas)
      // 3+ pontos → polígono fechado (área + rodapé)
      if (activePoints.length === 2) {
        const length = calculateLineLength(activePoints, pixelsPerMeter);
        setPendingSegment({ coordinates: [...activePoints], comprimento: length });
        setShowSegmentDialog(true);
        return;
      }
      if (activePoints.length >= 3) {
        const area = calculatePolygonArea(activePoints, pixelsPerMeter);
        const perimetro = calculatePolygonPerimeter(activePoints, pixelsPerMeter);
        setPendingSave({ tipo: "area", coordinates: [...activePoints], valor: area, perimetro });
        setAberturas([]);
        setPeDireito("2.70");
        setShowSaveDialog(true);
        return;
      }
    } else if (mode === "measure_area" && activePoints.length >= 3 && pixelsPerMeter > 0) {
      const area = calculatePolygonArea(activePoints, pixelsPerMeter);
      const perimetro = calculatePolygonPerimeter(activePoints, pixelsPerMeter);
      setPendingSave({ tipo: "area", coordinates: [...activePoints], valor: area, perimetro });
      setAberturas([]);
      setPeDireito("2.70");
      setShowSaveDialog(true);
    } else if (mode === "draw_room" && activePoints.length >= 3) {
      setPendingRoomCoords([...activePoints]);
      setShowRoomDialog(true);
    }
  }, [mode, activePoints, pixelsPerMeter]);

  // Derived calc for area dialog (perimeter × pé direito − aberturas)
  const peDireitoNum = Math.max(0, parseFloat(peDireito) || 0);
  const aberturasAreaTotal = aberturas.reduce((s, a) => {
    const l = parseFloat(a.largura) || 0;
    const h = parseFloat(a.altura) || 0;
    return s + l * h;
  }, 0);
  const paredesAreaBruta = (pendingSave?.perimetro ?? 0) * peDireitoNum;
  const paredesAreaLiquida = Math.max(0, paredesAreaBruta - aberturasAreaTotal);

  const addAbertura = (tipo: AberturaTipo) => {
    setAberturas((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        tipo,
        largura: tipo === "porta" ? "0.80" : "1.20",
        altura: tipo === "porta" ? "2.10" : "1.20",
      },
    ]);
  };
  const updateAbertura = (id: string, patch: Partial<AberturaCalc>) => {
    setAberturas((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };
  const removeAbertura = (id: string) => {
    setAberturas((prev) => prev.filter((a) => a.id !== id));
  };

  // Save measurement
  const handleConfirmSave = async () => {
    if (!pendingSave) return;
    const cor = MEASUREMENT_COLORS[colorIndex % MEASUREMENT_COLORS.length];
    const baseEtiqueta = saveEtiqueta?.trim() || (pendingSave.tipo === "area" ? "Área" : pendingSave.tipo === "linha" ? "Linha" : "Contagem");

    // 1) Main measurement (the polygon area / line length / count)
    await addMeasurement.mutateAsync({
      tipo: pendingSave.tipo,
      coordinates: pendingSave.coordinates,
      valorBruto: parseFloat(pendingSave.valor.toFixed(4)),
      unidade: pendingSave.tipo === "contagem" ? "un" : pendingSave.tipo === "area" ? "m²" : "m",
      camada: saveCamada || undefined,
      etiqueta: baseEtiqueta,
      cor,
      ...(pendingSave.tipo === "area" && pendingSave.perimetro
        ? { baseboard_length: parseFloat(pendingSave.perimetro.toFixed(4)) }
        : {}),
    });

    // 2) For closed polygons (area), also persist perimeter + wall areas if user opted in
    if (pendingSave.tipo === "area" && pendingSave.perimetro && pendingSave.perimetro > 0) {
      // Perimeter as a 'linha' measurement so it can be reused (rodapés, contornos…)
      await addMeasurement.mutateAsync({
        tipo: "linha",
        coordinates: [...pendingSave.coordinates, pendingSave.coordinates[0]],
        valorBruto: parseFloat(pendingSave.perimetro.toFixed(4)),
        unidade: "m",
        camada: saveCamada || undefined,
        etiqueta: `${baseEtiqueta} — Rodapé`,
        cor,
      });

      if (includeWallsAsMeasurement && peDireitoNum > 0 && paredesAreaLiquida > 0) {
        const obs = `Paredes (líquido): perímetro ${pendingSave.perimetro.toFixed(2)} m × pé direito ${peDireitoNum.toFixed(2)} m = ${paredesAreaBruta.toFixed(2)} m² − aberturas ${aberturasAreaTotal.toFixed(2)} m²`;
        await addMeasurement.mutateAsync({
          tipo: "area",
          coordinates: pendingSave.coordinates,
          valorBruto: parseFloat(paredesAreaLiquida.toFixed(4)),
          unidade: "m²",
          camada: saveCamada || undefined,
          etiqueta: `${baseEtiqueta} — Paredes (h=${peDireitoNum.toFixed(2)} m)`,
          cor,
          observacao: obs,
        } as any);
      }
    }

    setColorIndex((i) => i + 1);
    setActivePoints([]);
    setPendingSave(null);
    setShowSaveDialog(false);
    setSaveEtiqueta("");
    setSaveCamada("");
    setAberturas([]);
    setPeDireito("2.70");
    toast.success("Medição guardada");
  };

  const handleCancelSave = () => {
    setShowSaveDialog(false);
    setPendingSave(null);
    setSaveEtiqueta("");
    setSaveCamada("");
    setAberturas([]);
    setPeDireito("2.70");
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
  const handleCancelDrawing = () => { setActivePoints([]); toast.info("Desenho cancelado"); };

  const handleConfirmOpening = async () => {
    if (!pendingOpening) return;
    const largura = parseFloat(openingLargura) || 0.8;
    const altura = parseFloat(openingAltura) || 2.1;
    await addOpening.mutateAsync({
      wall_id: pendingOpening.wallId,
      tipo: openingTipo as any,
      largura_m: largura,
      altura_m: altura,
      peitoril_m: openingPeitoril ? parseFloat(openingPeitoril) : undefined,
      posicao_na_parede: { x: pendingOpening.x, y: pendingOpening.y },
    } as any);
    setShowOpeningDialog(false);
    setPendingOpening(null);
    setOpeningTipo("porta");
    setOpeningLargura("0.80");
    setOpeningAltura("2.10");
    setOpeningPeitoril("");
  };

  const handleCancelOpening = () => {
    setShowOpeningDialog(false);
    setPendingOpening(null);
    setOpeningPeitoril("");
  };

  // Save segment (parede isolada com ações construtivas) — registo único com metadados estruturados
  const handleConfirmSegment = async (payload: SegmentSavePayload) => {
    // Modo edição → atualizar registo existente
    if (editingSegmentId) {
      await updateMeasurement.mutateAsync({
        id: editingSegmentId,
        etiqueta: payload.etiqueta,
        camada: payload.camada || undefined,
        observacao: payload.observacao,
        action_type: payload.acao,
        ceiling_height: payload.pe_direito_m,
        wall_area: payload.area_liquida_m2,
        openings_area: payload.aberturas_m2,
        wall_thickness_cm: payload.espessura_cm ?? null,
        demolition_volume: payload.volume_demolicao_m3 ?? null,
        material_id: payload.material_id ?? null,
        material_label: payload.material_label ?? null,
      });
      setEditingSegmentId(null);
      setEditingSegmentInitial(null);
      setPendingSegment(null);
      setShowSegmentDialog(false);
      toast.success("Segmento atualizado");
      return;
    }

    if (!pendingSegment) return;
    const cor = MEASUREMENT_COLORS[colorIndex % MEASUREMENT_COLORS.length];
    const baseEtiqueta = payload.etiqueta;

    await addMeasurement.mutateAsync({
      tipo: "linha",
      coordinates: pendingSegment.coordinates,
      valorBruto: payload.comprimento_m,
      unidade: "m",
      camada: payload.camada || undefined,
      etiqueta: baseEtiqueta,
      cor,
      observacao: payload.observacao,
      action_type: payload.acao,
      segment_length: payload.comprimento_m,
      ceiling_height: payload.pe_direito_m,
      wall_area: payload.area_liquida_m2,
      openings_area: payload.aberturas_m2,
      wall_thickness_cm: payload.espessura_cm ?? undefined,
      demolition_volume: payload.volume_demolicao_m3 ?? undefined,
      material_id: payload.material_id ?? null,
      material_label: payload.material_label ?? null,
    });

    setColorIndex((i) => i + 1);
    setActivePoints([]);
    setPendingSegment(null);
    setShowSegmentDialog(false);
    toast.success("Segmento guardado");
  };

  const handleCancelSegment = () => {
    setShowSegmentDialog(false);
    setPendingSegment(null);
    setEditingSegmentId(null);
    setEditingSegmentInitial(null);
    setActivePoints([]);
  };

  // Abrir dialog em modo edição a partir da lista de medições
  const handleEditSegmentRequest = (m: typeof measurements[number]) => {
    const coords = (m.coordinates as Array<{ x: number; y: number }>) ?? [];
    setEditingSegmentId(m.id);
    setEditingSegmentInitial({
      pe_direito_m: m.ceiling_height ?? 2.7,
      acao: (m.action_type ?? "construir") as any,
      espessura_cm: m.wall_thickness_cm ?? null,
      material_id: m.material_id ?? null,
      material_label: m.material_label ?? null,
      etiqueta: m.etiqueta ?? "",
      aberturas_m2: m.openings_area ?? 0,
    });
    setPendingSegment({ coordinates: coords, comprimento: m.segment_length ?? m.valor_bruto });
    setShowSegmentDialog(true);
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

  // Summary bar stats
  const totalLinhas = measurements.filter((m) => m.tipo === "linha").reduce((s, m) => s + m.valor_bruto, 0);
  const totalAreas = measurements.filter((m) => m.tipo === "area").reduce((s, m) => s + m.valor_bruto, 0);
  const totalRoomsArea = rooms.reduce((s, r) => s + r.area_m2, 0);
  const totalRodape = measurements
    .filter((m) => m.tipo === "linha" && (m.etiqueta ?? "").toLowerCase().includes("rodapé"))
    .reduce((s, m) => s + m.valor_bruto, 0);

  return (
    <AppLayout title={plan.nome_ficheiro} subtitle={`Rev. ${plan.revision_number}`}>
      <div className="p-4 md:p-6 space-y-3 md:space-y-4">
        {/* Top bar - simplified */}
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
          <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
            <Upload className="w-4 h-4 mr-1.5" /> Carregar nova planta
          </Button>
        </div>

        {/* Unified workflow bar (stepper + guide + toolbar + active hint) */}
        <PlanWorkflowBar
          currentStep={effectiveStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          mode={mode === "calibrate" ? "view" : mode}
          onModeChange={handleModeChange}
          canMeasure={canMeasure}
          onUndo={handleUndo}
          hasActivePoints={activePoints.length > 0}
          measurementCount={measurements.length}
          roomCount={rooms.length}
          wallCount={walls.length}
          openingCount={openings.length}
          placedElementsCount={placedElements.length}
          hasAnalysis={hasAnalysis}
          onPrimaryAction={() => {
            if (effectiveStep === "calibrate") handleStartCalibration();
            if (effectiveStep === "budget") navigate(`/obras/${obraId}/plantas/${planId}/quantitativos`);
          }}
          rightSlot={
            <div className="flex items-center gap-2">
              <PlanGripPreferences />
              {canMeasure ? <PlanSymbolPicker disabled={!canMeasure} onSelectSymbol={handleSelectSymbol} /> : null}
            </div>
          }
        />

        {/* Summary bar */}
        {(measurements.length > 0 || rooms.length > 0 || walls.length > 0 || placedElements.length > 0) && (
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
            {totalRodape > 0 && (
              <span className="flex items-center gap-1">
                <Minus className="w-3 h-3" /> Rodapé: {totalRodape.toFixed(2)} m
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
            {placedElements.length > 0 && (
              <span className="flex items-center gap-1">
                <Plug className="w-3 h-3" /> {placedElements.length} elementos
              </span>
            )}
          </div>
        )}

        {/* Axia analysis tables — per-room breakdown + global totals (prominent, above main content) */}
        {(() => {
          const t = planRoomAnalysis.totals;
          const hasGlobalData =
            (t?.floor_area_m2_total ?? 0) > 0 ||
            (t?.baseboard_m_total ?? 0) > 0 ||
            (t?.interior_walls_m2_total ?? 0) > 0 ||
            (t?.exterior_walls_m2_estimate ?? 0) > 0 ||
            (t?.doors_qtd_total ?? 0) > 0 ||
            (t?.windows_qtd_total ?? 0) > 0 ||
            (t?.doorsByDim?.length ?? 0) > 0 ||
            (t?.windowsByDim?.length ?? 0) > 0;
          const hasPerRoom = planRoomAnalysis.perRoom.length > 0;
          if (!hasGlobalData && !hasPerRoom) return null;
          return (
            <div className="space-y-4">
              <PlanAnalysisParametersCard
                ceilingHeightM={analysisParams.ceilingHeightM}
                doorHeightM={analysisParams.doorHeightM}
                onChange={setAnalysisParams}
              />
              {hasPerRoom && (
                <PlanRoomBreakdownTable
                  rows={planRoomAnalysis.perRoom}
                  onRename={async (id, newName) => {
                    if (id.startsWith("axia-")) {
                      toast.info("Para renomear, primeiro converta a análise da Axia em compartimentos.");
                      return;
                    }
                    await updateRoom.mutateAsync({ id, nome: newName });
                  }}
                />
              )}
              <PlanGlobalQuantityTable totals={planRoomAnalysis.totals} />
            </div>
          );
        })()}

        {/* Main content */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
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
            openings={openings.map((o) => ({
              id: o.id,
              wall_id: o.wall_id,
              tipo: o.tipo,
              largura_m: o.largura_m,
              altura_m: o.altura_m,
              posicao_na_parede: o.posicao_na_parede,
            }))}
            selectedRoomId={selectedRoomId}
            onMeasurementClick={handleCanvasClick}
            onMeasurementComplete={handleCanvasComplete}
            activeMeasurementPoints={activePoints}
            pixelsPerMeter={pixelsPerMeter}
            currentPage={currentPage}
            totalPages={isPdf ? totalPages : 1}
            onPageChange={setCurrentPage}
            placedElements={placedElements}
            activeInsertSymbolId={insertTool.symbolTypeId}
            insertedCount={insertTool.insertedCount}
            onInsertFinish={handleInsertFinish}
            onInsertUndo={handleInsertUndo}
            onInsertChangeType={handleInsertChangeType}
            onInsertCancel={handleInsertCancel}
            onElementClick={handleElementClick}
            onCancelDrawing={handleCancelDrawing}
            roomAnalysis={planRoomAnalysis.perRoom.map((r) => ({
              room_id: r.room_id,
              area_m2: r.area_m2,
              walls_m2: r.walls_m2,
              baseboard_m: r.baseboard_m,
              ceiling_height_m: r.ceiling_height_m,
              elements: r.elements.map((e) => ({ tipo: e.tipo, largura_cm: e.largura_cm, altura_cm: e.altura_cm, qtd: e.qtd })),
              edges: r.edges,
            }))}
          />

          {/* Side panel - contextual based on step */}
          <div className="space-y-4 xl:max-h-[calc(100vh-280px)] xl:overflow-y-auto xl:pr-1">
            {/* Always show calibration when on calibrate step or not yet calibrated */}
            {(effectiveStep === "calibrate" || !canMeasure) && (
              <PlanCalibrationTool
                points={calibrationPoints}
                isCalibrating={mode === "calibrate"}
                onStartCalibration={handleStartCalibration}
                onSaveCalibration={handleSaveCalibration}
                onReset={handleResetCalibration}
                currentCalibration={calibration}
                isSaving={saveCalibration.isPending}
              />
            )}

            {/* Axia Guided Mode */}
            <AxiaGuidedMode
              enabled={guidedMode}
              onToggle={setGuidedMode}
              status={{
                calibrated: canMeasure,
                hasFloors: floors.length > 0,
                hasMeasurements: measurements.length > 0 || rooms.length > 0,
                hasValidated:
                  measurements.length > 0 &&
                  measurements.every((m) => m.estado_validacao !== "pendente"),
              }}
              onStartCalibration={handleStartCalibration}
              onCreateFloor={() => {
                // Scroll to floor selector
                document.getElementById("plan-floor-selector")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              onStartMeasure={() => handleModeChange("measure_area")}
              onOpenValidation={() => navigate(`/obras/${obraId}/plantas/${planId}/quantitativos`)}
            />

            {/* Pavimentos */}
            <div id="plan-floor-selector">
              <PlanFloorSelector
                obraId={obraId}
                selectedFloorId={selectedFloorId}
                onSelectFloor={setSelectedFloorId}
              />
            </div>

            {/* Show Axia analysis prominently on analyze step, or compact on others */}
            {(effectiveStep === "analyze" || canMeasure) && (
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
                onAnalysisComplete={() => {
                  setHasAnalysis(true);
                  setWorkflowStep("analyze");
                  // mark current page as analyzed (handled via onResultChange below)
                }}
                result={axiaResultsByPage[currentPage] ?? null}
                onResultChange={(next) => {
                  setAxiaResultsByPage((prev) => {
                    const copy = { ...prev };
                    if (next) copy[currentPage] = next;
                    else delete copy[currentPage];
                    return copy;
                  });
                  // Persistência DB (assíncrona, não bloqueia UI)
                  if (next) {
                    const rq = (next as any)?.reading_quality ?? {};
                    void axiaPersist.saveAnalysis(currentPage, next, {
                      model: "google/gemini-2.5-flash",
                      riskLevel: rq.risk_level ?? null,
                      reviewRequired: !!rq.human_intervention_required,
                      floorId: selectedFloorId,
                    });
                  } else {
                    void axiaPersist.clearAnalysis(currentPage);
                  }
                }}
                currentPage={currentPage}
                totalPages={isPdf ? totalPages : 1}
                onSelectPage={(p) => setCurrentPage(p)}
                analyzedPages={Object.keys(axiaResultsByPage).map(Number)}
                onAnalyzeAllPending={() => {
                  const pending = Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => !axiaResultsByPage[p]);
                  if (pending.length === 0) {
                    toast.info("Todas as folhas já estão analisadas.");
                    return;
                  }
                  toast.info(`A analisar ${pending.length} folhas em sequência...`);
                  setPendingAnalyzeQueue(pending);
                  setCurrentPage(pending[0]);
                  setAutoAnalyzeToken((t) => t + 1);
                }}
                autoAnalyzeToken={autoAnalyzeToken}
                resultsByPage={axiaResultsByPage}
                obraId={obraId}
                planImportId={planId}
                planName={plan?.nome_ficheiro ?? undefined}
                onHighlightPosition={(x, y) => {
                  // best-effort: relies on PlanViewer's panning to focus point — noop placeholder
                  console.log("Highlight position requested:", x, y);
                }}
              />
            )}

            {/* Calibration compact view when already calibrated and not on calibrate step */}
            {canMeasure && effectiveStep !== "calibrate" && (
              <PlanCalibrationTool
                points={calibrationPoints}
                isCalibrating={mode === "calibrate"}
                onStartCalibration={handleStartCalibration}
                onSaveCalibration={handleSaveCalibration}
                onReset={handleResetCalibration}
                currentCalibration={calibration}
                isSaving={saveCalibration.isPending}
              />
            )}

            {/* Measurements/Rooms/Walls tabs - show on measure step or when there's data */}
            {(effectiveStep === "measure" || measurements.length > 0 || rooms.length > 0 || walls.length > 0) && (
              <Tabs defaultValue="measurements" className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="measurements" className="text-xs gap-1">
                    <Minus className="w-3 h-3" /> Medições {measurements.length > 0 && <Badge variant="secondary" className="text-[9px] px-1 ml-1">{measurements.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="rooms" className="text-xs gap-1">
                    <SquareDashed className="w-3 h-3" /> Comp. {rooms.length > 0 && <Badge variant="secondary" className="text-[9px] px-1 ml-1">{rooms.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="walls" className="text-xs gap-1">
                    <Wallpaper className="w-3 h-3" /> Paredes {walls.length > 0 && <Badge variant="secondary" className="text-[9px] px-1 ml-1">{walls.length}</Badge>}
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
                    onEditSegment={handleEditSegmentRequest}
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
            )}

            {/* Electrical Analysis — sempre disponível, independentemente do passo */}
            {effectiveImageUrl && (
              <PlanElectricalAnalysis
                imageDataUrl={effectiveImageUrl}
                calibration={calibration ? {
                  pixels_per_meter: calibration.pixels_per_meter,
                  real_distance: calibration.real_distance,
                  unidade: calibration.unidade,
                } : null}
              />
            )}

            {/* Painel contextual da última medição estruturada (segmento com ação) */}
            {(() => {
              const lastStructured = [...measurements].reverse().find((m) => !!m.action_type);
              if (!lastStructured || !obraId) return null;
              return (
                <div className="space-y-3">
                  <PlanAxiaSummaryStrip measurements={measurements} />
                  <PlanMeasurementBudgetPanel measurement={lastStructured} obraId={obraId} />
                  <PlanMeasurementAxiaPanel measurement={lastStructured} />
                </div>
              );
            })()}

            {/* Budget action on budget step */}
            {effectiveStep === "budget" && (
              <Button
                className="w-full"
                onClick={() => navigate(`/obras/${obraId}/plantas/${planId}/quantitativos`)}
                disabled={measurements.length === 0 && rooms.length === 0}
              >
                <Table2 className="w-4 h-4 mr-2" />
                Abrir Quantitativos e Orçamentação
              </Button>
            )}

            {/* Export placed elements to budget */}
            {placedElements.length > 0 && obraId && (
              <PlanElementsExportBudget elements={placedElements} obraId={obraId} />
            )}
          </div>
        </div>

      </div>

      {/* Save measurement dialog */}
      <Dialog open={showSaveDialog} onOpenChange={(open) => !open && handleCancelSave()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {pendingSave?.tipo === "linha" ? "Guardar Medição de Linha" : pendingSave?.tipo === "area" ? "Guardar Medição de Área" : "Guardar Contagem"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Headline metrics */}
            {pendingSave?.tipo === "area" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Área</p>
                  <p className="text-xl font-bold text-foreground">
                    {pendingSave.valor.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">m²</span>
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Rodapé (perímetro)</p>
                  <p className="text-xl font-bold text-foreground">
                    {(pendingSave.perimetro ?? 0).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">m</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {pendingSave?.valor.toFixed(pendingSave.tipo === "contagem" ? 0 : 2)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {pendingSave?.tipo === "contagem" ? "un" : "m"}
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Etiqueta (opcional)</Label>
              <Input value={saveEtiqueta} onChange={(e) => setSaveEtiqueta(e.target.value)} placeholder="Ex: Sala, Cozinha, Quarto 1..." />
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

            {/* Wall calculator – only for closed polygons (area) */}
            {pendingSave?.tipo === "area" && (pendingSave.perimetro ?? 0) > 0 && (
              <div className="border rounded-lg p-3 space-y-3 bg-card">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Cálculo de Paredes</p>
                    <p className="text-[11px] text-muted-foreground">
                      Rodapé × pé direito − aberturas
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeWallsAsMeasurement}
                      onChange={(e) => setIncludeWallsAsMeasurement(e.target.checked)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    Guardar como medição
                  </label>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Pé direito h (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={peDireito}
                    onChange={(e) => setPeDireito(e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Aberturas list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Aberturas (a subtrair)</Label>
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => addAbertura("janela")}>
                        + Janela
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => addAbertura("porta")}>
                        + Porta
                      </Button>
                    </div>
                  </div>

                  {aberturas.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic">Sem aberturas. Adicione janelas ou portas a subtrair.</p>
                  ) : (
                    <div className="space-y-2">
                      {aberturas.map((a) => {
                        const l = parseFloat(a.largura) || 0;
                        const h = parseFloat(a.altura) || 0;
                        const area = l * h;
                        return (
                          <div key={a.id} className="grid grid-cols-[70px_1fr_1fr_70px_28px] items-end gap-2">
                            <div className="text-[11px] font-medium pb-2">
                              {a.tipo === "janela" ? "Janela" : "Porta"}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">L (m)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={a.largura}
                                onChange={(e) => updateAbertura(a.id, { largura: e.target.value })}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">A (m)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={a.altura}
                                onChange={(e) => updateAbertura(a.id, { altura: e.target.value })}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="text-[11px] text-right pb-2 font-medium tabular-nums">
                              {area.toFixed(2)} m²
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-7"
                              onClick={() => removeAbertura(a.id)}
                              aria-label="Remover abertura"
                            >
                              ×
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="rounded-md bg-muted/60 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paredes (bruto)</span>
                    <span className="tabular-nums">
                      {(pendingSave.perimetro ?? 0).toFixed(2)} × {peDireitoNum.toFixed(2)} = <strong>{paredesAreaBruta.toFixed(2)} m²</strong>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">− Aberturas</span>
                    <span className="tabular-nums">{aberturasAreaTotal.toFixed(2)} m²</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="font-semibold">Paredes (líquido)</span>
                    <span className="font-bold text-primary tabular-nums">{paredesAreaLiquida.toFixed(2)} m²</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Útil para pinturas, revestimentos e coberturas. A área da planta ({pendingSave.valor.toFixed(2)} m²) serve para pisos.
                  </p>
                </div>
              </div>
            )}
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

      {/* Opening (vão) dialog – triggered by clicking near a wall in draw_opening mode */}
      <Dialog open={showOpeningDialog} onOpenChange={(open) => !open && handleCancelOpening()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Adicionar Vão à Parede</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-muted rounded-lg p-2 text-center text-xs text-muted-foreground">
              Vão posicionado sobre a parede mais próxima
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={openingTipo} onValueChange={setOpeningTipo}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="porta">Porta</SelectItem>
                  <SelectItem value="janela">Janela</SelectItem>
                  <SelectItem value="portada">Portada</SelectItem>
                  <SelectItem value="claraboia">Clarabóia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Largura (m)</Label>
                <Input value={openingLargura} onChange={(e) => setOpeningLargura(e.target.value)} type="number" step="0.01" min="0.1" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Altura (m)</Label>
                <Input value={openingAltura} onChange={(e) => setOpeningAltura(e.target.value)} type="number" step="0.01" min="0.1" />
              </div>
            </div>
            {(openingTipo === "janela" || openingTipo === "claraboia") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Peitoril (m) — opcional</Label>
                <Input value={openingPeitoril} onChange={(e) => setOpeningPeitoril(e.target.value)} type="number" step="0.01" placeholder="1.10" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelOpening}>Cancelar</Button>
            <Button onClick={handleConfirmOpening} disabled={addOpening.isPending}>
              {addOpening.isPending ? "A guardar..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Segment dialog (parede isolada com ações construtivas) */}
      <PlanSegmentDialog
        open={showSegmentDialog}
        onClose={handleCancelSegment}
        comprimentoMetros={pendingSegment?.comprimento ?? 0}
        onConfirm={handleConfirmSegment}
        isSaving={addMeasurement.isPending || updateMeasurement.isPending}
        mode={editingSegmentId ? "edit" : "create"}
        initialValues={editingSegmentInitial}
      />

      {/* Element properties dialog */}
      <PlanElementProperties
        element={selectedElement}
        open={showElementProps}
        onClose={() => { setShowElementProps(false); setSelectedElement(null); }}
        onUpdate={handleUpdateElement}
        onDelete={handleDeleteElement}
      />

      {/* Upload new plan dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl p-0 bg-transparent border-0 shadow-none">
          {obraId && (
            <PlanUploadForm
              obraId={obraId}
              isUploading={uploadPlan.isPending}
              onCancel={() => setShowUploadDialog(false)}
              onUpload={async (data) => {
                const created = await uploadPlan.mutateAsync(data);
                setShowUploadDialog(false);
                if (created?.id) {
                  navigate(`/obras/${obraId}/plantas/${created.id}`);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
