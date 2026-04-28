import { useState, useRef, useCallback, useEffect } from "react";
import { Stage, Layer, Image as KonvaImage, Line, Circle, Text, Group, Rect } from "react-konva";
import { Loader2, ZoomIn, ZoomOut, RotateCcw, Ruler, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type Konva from "konva";
import type { MeasureMode } from "./PlanMeasurementToolbar";
import type { PlacedPlantElement } from "@/types/plan-symbols";
import { getSymbolById } from "@/types/plan-symbols";
import { PlanInsertToolbar } from "./PlanInsertToolbar";

const ROOM_COLORS = [
  "#8b5cf6", "#06b6d4", "#f59e0b", "#22c55e", "#ec4899", "#ef4444", "#3b82f6",
];

const WALL_COLOR = "#a855f7";

interface PlanViewerProps {
  imageDataUrl: string | null;
  dimensions: { width: number; height: number };
  isRendering: boolean;
  mode: MeasureMode;
  calibrationPoints: Array<{ x: number; y: number }>;
  onCalibrationClick: (point: { x: number; y: number }) => void;
  measurements?: Array<{
    id: string;
    tipo: string;
    coordinates: Array<{ x: number; y: number }>;
    cor: string;
    etiqueta?: string;
    valor_bruto: number;
    unidade: string;
  }>;
  rooms?: Array<{
    id: string;
    nome: string;
    boundary_coords: Array<{ x: number; y: number }>;
    area_m2: number;
  }>;
  walls?: Array<{
    id: string;
    start_point: { x: number; y: number };
    end_point: { x: number; y: number };
    espessura_cm: number;
    comprimento_m: number;
  }>;
  openings?: Array<{
    id: string;
    wall_id: string;
    tipo: string;
    largura_m: number;
    altura_m: number;
    posicao_na_parede?: { x: number; y: number } | null;
  }>;
  selectedRoomId?: string;
  onMeasurementClick?: (point: { x: number; y: number }) => void;
  onMeasurementComplete?: () => void;
  activeMeasurementPoints?: Array<{ x: number; y: number }>;
  pixelsPerMeter?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  // Element insertion
  placedElements?: PlacedPlantElement[];
  activeInsertSymbolId?: string | null;
  insertedCount?: number;
  onInsertFinish?: () => void;
  onInsertUndo?: () => void;
  onInsertChangeType?: () => void;
  onInsertCancel?: () => void;
  onElementClick?: (element: PlacedPlantElement) => void;
  onCancelDrawing?: () => void;
}

export function PlanViewer({
  imageDataUrl,
  dimensions,
  isRendering,
  mode,
  calibrationPoints,
  onCalibrationClick,
  measurements = [],
  rooms = [],
  walls = [],
  openings = [],
  selectedRoomId,
  onMeasurementClick,
  onMeasurementComplete,
  activeMeasurementPoints = [],
  pixelsPerMeter,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  placedElements = [],
  activeInsertSymbolId,
  insertedCount = 0,
  onInsertFinish,
  onInsertUndo,
  onInsertChangeType,
  onInsertCancel,
  onElementClick,
  onCancelDrawing,
}: PlanViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!imageDataUrl) return;
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: Math.max(500, containerRef.current.clientHeight),
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (image && dimensions.width > 0) {
      const scaleX = containerSize.width / dimensions.width;
      const scaleY = containerSize.height / dimensions.height;
      const fitScale = Math.min(scaleX, scaleY, 1) * 0.85;
      setZoom(fitScale);
      setPosition({
        x: (containerSize.width - dimensions.width * fitScale) / 2,
        y: (containerSize.height - dimensions.height * fitScale) / 2,
      });
    }
  }, [image, dimensions, containerSize]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = zoom;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.1, Math.min(5, newScale));
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };
    setZoom(clampedScale);
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }, [zoom, position]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (mode === "view") return;
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const imgX = (pointer.x - position.x) / zoom;
    const imgY = (pointer.y - position.y) / zoom;

    if (mode === "calibrate") {
      onCalibrationClick({ x: imgX, y: imgY });
    } else {
      onMeasurementClick?.({ x: imgX, y: imgY });
    }
  }, [mode, zoom, position, onCalibrationClick, onMeasurementClick]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    setPosition({ x: e.target.x(), y: e.target.y() });
  }, []);

  const resetView = () => {
    if (image && dimensions.width > 0) {
      const scaleX = containerSize.width / dimensions.width;
      const scaleY = containerSize.height / dimensions.height;
      const fitScale = Math.min(scaleX, scaleY, 1) * 0.85;
      setZoom(fitScale);
      setPosition({
        x: (containerSize.width - dimensions.width * fitScale) / 2,
        y: (containerSize.height - dimensions.height * fitScale) / 2,
      });
    }
  };

  const getCursorStyle = () => {
    if (mode !== "view") return "crosshair";
    return "grab";
  };

  const getModeLabel = () => {
    switch (mode) {
      case "calibrate": return `Calibração — Clique no ponto ${calibrationPoints.length + 1} de 2`;
      case "measure_line": return "Medição de linha — Clique para marcar pontos, duplo-clique para terminar";
      case "measure_area": return "Medição de área — Clique vértices, duplo-clique para fechar";
      case "measure_count": return "Contagem — Clique para marcar elementos";
      case "draw_room": return "Compartimento — Clique vértices do polígono, duplo-clique para fechar";
      case "draw_wall": return "Parede — Clique ponto inicial e ponto final (2 cliques)";
      case "draw_opening": return "Vão — Clique na posição sobre uma parede";
      case "insert_element": {
        const sym = activeInsertSymbolId ? getSymbolById(activeInsertSymbolId) : null;
        return sym ? `Inserir: ${sym.name} — Clique na planta` : "Selecione um tipo de elemento";
      }
      default: return "";
    }
  };

  if (isRendering) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-muted rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">A carregar planta...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-background/90 backdrop-blur border rounded-lg p-1 shadow-sm">
        {totalPages > 1 && (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => onPageChange?.(currentPage - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center px-1.5 text-xs text-muted-foreground whitespace-nowrap">
              {currentPage}/{totalPages}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => onPageChange?.(currentPage + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="w-px bg-border" />
          </>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(5, z * 1.2))}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.1, z / 1.2))}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetView}>
          <RotateCcw className="w-4 h-4" />
        </Button>
        <div className="flex items-center px-2 text-xs text-muted-foreground border-l">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Mode indicator */}
      {mode !== "view" && (
        <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm flex items-center gap-1.5">
          <Ruler className="w-3.5 h-3.5" />
          {getModeLabel()}
          {(mode === "measure_line" || mode === "measure_area" || mode === "draw_room") && activeMeasurementPoints.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-primary-foreground/20 text-[10px]">
              {activeMeasurementPoints.length} ponto{activeMeasurementPoints.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Floating action bar for active drawing modes */}
      {(mode === "measure_line" || mode === "measure_area" || mode === "draw_room") && activeMeasurementPoints.length > 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background border shadow-lg rounded-full px-3 py-1.5">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {mode === "measure_line"
              ? "Mín. 2 pontos"
              : "Mín. 3 pontos"}
          </span>
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            disabled={
              (mode === "measure_line" && activeMeasurementPoints.length < 2) ||
              ((mode === "measure_area" || mode === "draw_room") && activeMeasurementPoints.length < 3)
            }
            onClick={() => onMeasurementComplete?.()}
          >
            ✓ Concluir
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onCancelDrawing?.()}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Canvas */}
      <div
        className="border rounded-lg overflow-hidden bg-muted"
        style={{ cursor: getCursorStyle(), height: containerSize.height }}
      >
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          onWheel={handleWheel}
          onClick={handleStageClick}
          onDblClick={() => {
            if (mode === "measure_line" || mode === "measure_area" || mode === "draw_room") {
              onMeasurementComplete?.();
            }
          }}
          draggable={mode === "view"}
          x={position.x}
          y={position.y}
          scaleX={zoom}
          scaleY={zoom}
          onDragEnd={handleDragEnd}
        >
          <Layer>
            {/* Page margin / shadow behind the plan */}
            {image && (
              <>
                {/* Drop shadow */}
                <Rect
                  x={4}
                  y={4}
                  width={image.width}
                  height={image.height}
                  fill="#00000022"
                  cornerRadius={2}
                />
                {/* White page background with border */}
                <Rect
                  x={0}
                  y={0}
                  width={image.width}
                  height={image.height}
                  fill="#ffffff"
                  stroke="#d1d5db"
                  strokeWidth={1 / zoom}
                  cornerRadius={1}
                />
                <KonvaImage image={image} x={0} y={0} />
              </>
            )}

            {/* Rooms */}
            {rooms.map((r, idx) => {
              if (r.boundary_coords.length < 3) return null;
              const color = ROOM_COLORS[idx % ROOM_COLORS.length];
              const isSelected = selectedRoomId === r.id;
              const flatPoints = r.boundary_coords.flatMap((c) => [c.x, c.y]);
              const cx = r.boundary_coords.reduce((s, c) => s + c.x, 0) / r.boundary_coords.length;
              const cy = r.boundary_coords.reduce((s, c) => s + c.y, 0) / r.boundary_coords.length;
              return (
                <Group key={`room-${r.id}`}>
                  <Line
                    points={flatPoints}
                    fill={color}
                    opacity={isSelected ? 0.25 : 0.1}
                    closed
                  />
                  <Line
                    points={flatPoints}
                    stroke={color}
                    strokeWidth={(isSelected ? 3 : 2) / zoom}
                    closed
                    dash={[8 / zoom, 4 / zoom]}
                  />
                  <Text
                    x={cx - 40 / zoom}
                    y={cy - 14 / zoom}
                    text={r.nome}
                    fontSize={13 / zoom}
                    fill={color}
                    fontStyle="bold"
                    align="center"
                    width={80 / zoom}
                  />
                  <Text
                    x={cx - 30 / zoom}
                    y={cy + 2 / zoom}
                    text={`${r.area_m2.toFixed(2)} m²`}
                    fontSize={11 / zoom}
                    fill={color}
                    align="center"
                    width={60 / zoom}
                  />
                </Group>
              );
            })}

            {/* Walls */}
            {walls.map((w) => (
              <Group key={`wall-${w.id}`}>
                <Line
                  points={[w.start_point.x, w.start_point.y, w.end_point.x, w.end_point.y]}
                  stroke={WALL_COLOR}
                  strokeWidth={Math.max(4, (w.espessura_cm / 5)) / zoom}
                  lineCap="round"
                />
                <Circle
                  x={w.start_point.x}
                  y={w.start_point.y}
                  radius={4 / zoom}
                  fill={WALL_COLOR}
                  stroke="white"
                  strokeWidth={1.5 / zoom}
                />
                <Circle
                  x={w.end_point.x}
                  y={w.end_point.y}
                  radius={4 / zoom}
                  fill={WALL_COLOR}
                  stroke="white"
                  strokeWidth={1.5 / zoom}
                />
                <Text
                  x={(w.start_point.x + w.end_point.x) / 2 - 20 / zoom}
                  y={(w.start_point.y + w.end_point.y) / 2 - 16 / zoom}
                  text={`${w.comprimento_m.toFixed(2)} m`}
                  fontSize={10 / zoom}
                  fill={WALL_COLOR}
                  fontStyle="bold"
                />
              </Group>
            ))}

            {/* Openings (vãos) – drawn perpendicular to wall, centered at posicao_na_parede */}
            {openings.map((o) => {
              const wall = walls.find((w) => w.id === o.wall_id);
              if (!wall) return null;
              // Position: stored point if available, otherwise wall midpoint
              const cx = o.posicao_na_parede?.x ?? (wall.start_point.x + wall.end_point.x) / 2;
              const cy = o.posicao_na_parede?.y ?? (wall.start_point.y + wall.end_point.y) / 2;
              // Wall direction (unit vector)
              const dx = wall.end_point.x - wall.start_point.x;
              const dy = wall.end_point.y - wall.start_point.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const ux = dx / len;
              const uy = dy / len;
              // Pixels per meter (estimate from wall length)
              const pxPerM = wall.comprimento_m > 0 ? len / wall.comprimento_m : 50;
              const halfWPx = (o.largura_m * pxPerM) / 2;
              const tickPx = Math.max(8, wall.espessura_cm / 5 + 6);
              // Endpoints on the wall axis
              const p1x = cx - ux * halfWPx;
              const p1y = cy - uy * halfWPx;
              const p2x = cx + ux * halfWPx;
              const p2y = cy + uy * halfWPx;
              // Perpendicular ticks
              const px = -uy;
              const py = ux;
              const opColor = o.tipo === "porta" ? "#16a34a" : "#0ea5e9";
              return (
                <Group key={`op-${o.id}`}>
                  {/* Cut line on the wall (white "gap") */}
                  <Line
                    points={[p1x, p1y, p2x, p2y]}
                    stroke="#ffffff"
                    strokeWidth={Math.max(6, wall.espessura_cm / 5 + 2) / zoom}
                    lineCap="butt"
                  />
                  {/* Opening fill */}
                  <Line
                    points={[p1x, p1y, p2x, p2y]}
                    stroke={opColor}
                    strokeWidth={3 / zoom}
                    lineCap="round"
                  />
                  {/* Perpendicular ticks at edges */}
                  <Line
                    points={[p1x - px * tickPx / zoom, p1y - py * tickPx / zoom, p1x + px * tickPx / zoom, p1y + py * tickPx / zoom]}
                    stroke={opColor}
                    strokeWidth={1.5 / zoom}
                  />
                  <Line
                    points={[p2x - px * tickPx / zoom, p2y - py * tickPx / zoom, p2x + px * tickPx / zoom, p2y + py * tickPx / zoom]}
                    stroke={opColor}
                    strokeWidth={1.5 / zoom}
                  />
                  {/* Door arc (simplified) for porta */}
                  {o.tipo === "porta" && (
                    <Line
                      points={[p1x, p1y, p1x + ux * halfWPx * 0.7, p1y + uy * halfWPx * 0.7, p2x - ux * halfWPx * 0.3 + px * halfWPx * 1.4, p2y - uy * halfWPx * 0.3 + py * halfWPx * 1.4]}
                      stroke={opColor}
                      strokeWidth={1 / zoom}
                      tension={0.5}
                      dash={[3 / zoom, 2 / zoom]}
                    />
                  )}
                  {/* Label */}
                  <Text
                    x={cx + px * (tickPx + 2) / zoom - 14 / zoom}
                    y={cy + py * (tickPx + 2) / zoom - 6 / zoom}
                    text={`${o.tipo === "porta" ? "P" : o.tipo === "janela" ? "J" : o.tipo[0].toUpperCase()} ${o.largura_m.toFixed(2)}`}
                    fontSize={9 / zoom}
                    fill={opColor}
                    fontStyle="bold"
                  />
                </Group>
              );
            })}
            {calibrationPoints.map((pt, i) => (
              <Group key={`cal-${i}`}>
                <Circle x={pt.x} y={pt.y} radius={6 / zoom} fill="hsl(var(--destructive))" stroke="white" strokeWidth={2 / zoom} />
                <Text x={pt.x + 10 / zoom} y={pt.y - 8 / zoom} text={`P${i + 1}`} fontSize={14 / zoom} fill="hsl(var(--destructive))" fontStyle="bold" />
              </Group>
            ))}
            {calibrationPoints.length === 2 && (
              <Line
                points={[calibrationPoints[0].x, calibrationPoints[0].y, calibrationPoints[1].x, calibrationPoints[1].y]}
                stroke="hsl(var(--destructive))"
                strokeWidth={2 / zoom}
                dash={[8 / zoom, 4 / zoom]}
              />
            )}

            {/* Existing measurements */}
            {measurements.map((m) => {
              if (m.tipo === "linha" && m.coordinates.length >= 2) {
                const flatPoints = m.coordinates.flatMap((c) => [c.x, c.y]);
                return (
                  <Group key={m.id}>
                    <Line points={flatPoints} stroke={m.cor} strokeWidth={3 / zoom} lineCap="round" lineJoin="round" />
                    {m.coordinates.map((c, i) => (
                      <Circle key={i} x={c.x} y={c.y} radius={4 / zoom} fill={m.cor} stroke="white" strokeWidth={1.5 / zoom} />
                    ))}
                    <Text
                      x={m.coordinates[0].x}
                      y={m.coordinates[0].y - 18 / zoom}
                      text={`${m.valor_bruto.toFixed(2)} ${m.unidade}${m.etiqueta ? ` (${m.etiqueta})` : ""}`}
                      fontSize={12 / zoom}
                      fill={m.cor}
                      fontStyle="bold"
                    />
                  </Group>
                );
              }
              if (m.tipo === "area" && m.coordinates.length >= 3) {
                const flatPoints = m.coordinates.flatMap((c) => [c.x, c.y]);
                const cx = m.coordinates.reduce((s, c) => s + c.x, 0) / m.coordinates.length;
                const cy = m.coordinates.reduce((s, c) => s + c.y, 0) / m.coordinates.length;
                return (
                  <Group key={m.id}>
                    <Line points={flatPoints} stroke={m.cor} strokeWidth={2 / zoom} closed fill={m.cor} opacity={0.2} />
                    <Line points={flatPoints} stroke={m.cor} strokeWidth={2.5 / zoom} closed />
                    {m.coordinates.map((c, i) => (
                      <Circle key={i} x={c.x} y={c.y} radius={4 / zoom} fill={m.cor} stroke="white" strokeWidth={1.5 / zoom} />
                    ))}
                    <Text
                      x={cx - 30 / zoom}
                      y={cy - 6 / zoom}
                      text={`${m.valor_bruto.toFixed(2)} ${m.unidade}${m.etiqueta ? ` (${m.etiqueta})` : ""}`}
                      fontSize={12 / zoom}
                      fill={m.cor}
                      fontStyle="bold"
                    />
                  </Group>
                );
              }
              if (m.tipo === "contagem") {
                return (
                  <Group key={m.id}>
                    {m.coordinates.map((c, i) => (
                      <Group key={i}>
                        <Circle x={c.x} y={c.y} radius={8 / zoom} fill={m.cor} opacity={0.7} />
                        <Text x={c.x - 4 / zoom} y={c.y - 5 / zoom} text={String(i + 1)} fontSize={10 / zoom} fill="white" fontStyle="bold" />
                      </Group>
                    ))}
                  </Group>
                );
              }
              return null;
            })}

            {/* Active measurement/drawing being drawn */}
            {activeMeasurementPoints.length > 0 && (
              <Group>
                {activeMeasurementPoints.length >= 2 && (
                  <Line
                    points={activeMeasurementPoints.flatMap((c) => [c.x, c.y])}
                    stroke={mode === "draw_room" ? "#8b5cf6" : mode === "draw_wall" ? WALL_COLOR : "hsl(var(--primary))"}
                    strokeWidth={3 / zoom}
                    lineCap="round"
                    lineJoin="round"
                    dash={[6 / zoom, 3 / zoom]}
                    closed={mode === "measure_area" || mode === "draw_room"}
                  />
                )}
                {(mode === "measure_area" || mode === "draw_room") && activeMeasurementPoints.length >= 3 && (
                  <Line
                    points={activeMeasurementPoints.flatMap((c) => [c.x, c.y])}
                    fill={mode === "draw_room" ? "#8b5cf6" : "hsl(var(--primary))"}
                    opacity={0.1}
                    closed
                  />
                )}
                {activeMeasurementPoints.map((c, i) => (
                  <Circle
                    key={i}
                    x={c.x}
                    y={c.y}
                    radius={5 / zoom}
                    fill={mode === "draw_room" ? "#8b5cf6" : mode === "draw_wall" ? WALL_COLOR : "hsl(var(--primary))"}
                    stroke="white"
                    strokeWidth={2 / zoom}
                  />
                ))}
              </Group>
            )}

            {/* Placed elements (symbols) */}
            {placedElements.map((el) => {
              const sym = getSymbolById(el.symbolTypeId);
              if (!sym) return null;
              const s = sym.shape;
              const scale = (el.scale ?? 1) / zoom;
              return (
                <Group
                  key={`el-${el.id}`}
                  x={el.x}
                  y={el.y}
                  rotation={el.rotation ?? 0}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    onElementClick?.(el);
                  }}
                >
                  {s.type === "circle" && (
                    <Circle radius={s.radius * scale} fill={s.fill} stroke={s.stroke} strokeWidth={1.5 / zoom} />
                  )}
                  {s.type === "rect" && (
                    <Rect x={-s.width * scale / 2} y={-s.height * scale / 2} width={s.width * scale} height={s.height * scale} fill={s.fill} stroke={s.stroke} strokeWidth={1.5 / zoom} cornerRadius={1} />
                  )}
                  {s.type === "cross" && (
                    <>
                      <Line points={[-s.size * scale, 0, s.size * scale, 0]} stroke={s.stroke} strokeWidth={2 / zoom} lineCap="round" />
                      <Line points={[0, -s.size * scale, 0, s.size * scale]} stroke={s.stroke} strokeWidth={2 / zoom} lineCap="round" />
                    </>
                  )}
                  {s.type === "triangle" && (
                    <Line
                      points={[0, -s.size * scale, -s.size * scale, s.size * scale * 0.7, s.size * scale, s.size * scale * 0.7]}
                      fill={s.fill} stroke={s.stroke} strokeWidth={1.5 / zoom} closed
                    />
                  )}
                  {s.type === "diamond" && (
                    <Line
                      points={[0, -s.size * scale, s.size * scale, 0, 0, s.size * scale, -s.size * scale, 0]}
                      fill={s.fill} stroke={s.stroke} strokeWidth={1.5 / zoom} closed
                    />
                  )}
                  {s.type === "star" && (() => {
                    const pts: number[] = [];
                    const outer = s.size * scale;
                    const inner = outer * 0.4;
                    for (let i = 0; i < 5; i++) {
                      const oa = -Math.PI / 2 + (2 * Math.PI * i) / 5;
                      const ia = oa + Math.PI / 5;
                      pts.push(outer * Math.cos(oa), outer * Math.sin(oa));
                      pts.push(inner * Math.cos(ia), inner * Math.sin(ia));
                    }
                    return <Line points={pts} fill={s.fill} stroke={s.stroke} strokeWidth={1 / zoom} closed />;
                  })()}
                  <Text
                    x={-20 / zoom}
                    y={(s.type === "circle" ? s.radius : s.type === "rect" ? s.height / 2 : 10) * scale + 2 / zoom}
                    text={sym.label}
                    fontSize={9 / zoom}
                    fill={s.stroke}
                    align="center"
                    width={40 / zoom}
                  />
                </Group>
              );
            })}
          </Layer>
        </Stage>
      </div>

      {/* Continuous insertion toolbar */}
      {mode === "insert_element" && activeInsertSymbolId && (
        <PlanInsertToolbar
          symbolTypeId={activeInsertSymbolId}
          insertedCount={insertedCount}
          onFinish={onInsertFinish ?? (() => {})}
          onUndo={onInsertUndo ?? (() => {})}
          onChangeType={onInsertChangeType ?? (() => {})}
          onCancel={onInsertCancel ?? (() => {})}
        />
      )}
    </div>
  );
}
