import { useState, useRef, useCallback, useEffect } from "react";
import { Stage, Layer, Image as KonvaImage, Line, Circle, Text, Group } from "react-konva";
import { Loader2, ZoomIn, ZoomOut, RotateCcw, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import type Konva from "konva";

interface PlanViewerProps {
  imageDataUrl: string | null;
  dimensions: { width: number; height: number };
  isRendering: boolean;
  mode: "view" | "calibrate" | "measure_line" | "measure_area" | "measure_count";
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
  onMeasurementClick?: (point: { x: number; y: number }) => void;
  onMeasurementComplete?: () => void;
  activeMeasurementPoints?: Array<{ x: number; y: number }>;
  pixelsPerMeter?: number;
}

export function PlanViewer({
  imageDataUrl,
  dimensions,
  isRendering,
  mode,
  calibrationPoints,
  onCalibrationClick,
  measurements = [],
  onMeasurementClick,
  onMeasurementComplete,
  activeMeasurementPoints = [],
  pixelsPerMeter,
}: PlanViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Load image from data URL
  useEffect(() => {
    if (!imageDataUrl) return;
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  // Responsive container
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

  // Fit image when loaded
  useEffect(() => {
    if (image && dimensions.width > 0) {
      const scaleX = containerSize.width / dimensions.width;
      const scaleY = containerSize.height / dimensions.height;
      const fitScale = Math.min(scaleX, scaleY, 1) * 0.9;
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

    // Convert to image coordinates
    const imgX = (pointer.x - position.x) / zoom;
    const imgY = (pointer.y - position.y) / zoom;

    if (mode === "calibrate") {
      onCalibrationClick({ x: imgX, y: imgY });
    } else if (mode === "measure_line" || mode === "measure_count" || mode === "measure_area") {
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
      const fitScale = Math.min(scaleX, scaleY, 1) * 0.9;
      setZoom(fitScale);
      setPosition({
        x: (containerSize.width - dimensions.width * fitScale) / 2,
        y: (containerSize.height - dimensions.height * fitScale) / 2,
      });
    }
  };

  const getCursorStyle = () => {
    if (mode === "calibrate" || mode === "measure_line" || mode === "measure_count" || mode === "measure_area") return "crosshair";
    return "grab";
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
          {mode === "calibrate" && `Calibração — Clique no ponto ${calibrationPoints.length + 1} de 2`}
          {mode === "measure_line" && "Medição de linha — Clique para marcar pontos, duplo-clique para terminar"}
          {mode === "measure_area" && "Medição de área — Clique vértices do polígono, duplo-clique para fechar"}
          {mode === "measure_count" && "Contagem — Clique para marcar elementos"}
        </div>
      )}

      {/* Canvas */}
      <div
        className="border rounded-lg overflow-hidden bg-muted/30"
        style={{ cursor: getCursorStyle(), height: containerSize.height }}
      >
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          onWheel={handleWheel}
          onClick={handleStageClick}
          onDblClick={() => {
            if (mode === "measure_line" || mode === "measure_area") onMeasurementComplete?.();
          }}
          draggable={mode === "view"}
          x={position.x}
          y={position.y}
          scaleX={zoom}
          scaleY={zoom}
          onDragEnd={handleDragEnd}
        >
          <Layer>
            {/* PDF Image */}
            {image && <KonvaImage image={image} x={0} y={0} />}

            {/* Calibration points and line */}
            {calibrationPoints.map((pt, i) => (
              <Group key={`cal-${i}`}>
                <Circle x={pt.x} y={pt.y} radius={6 / zoom} fill="hsl(var(--destructive))" stroke="white" strokeWidth={2 / zoom} />
                <Text
                  x={pt.x + 10 / zoom}
                  y={pt.y - 8 / zoom}
                  text={`P${i + 1}`}
                  fontSize={14 / zoom}
                  fill="hsl(var(--destructive))"
                  fontStyle="bold"
                />
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

            {/* Active measurement being drawn */}
            {activeMeasurementPoints.length > 0 && (
              <Group>
                {activeMeasurementPoints.length >= 2 && (
                  <Line
                    points={activeMeasurementPoints.flatMap((c) => [c.x, c.y])}
                    stroke="hsl(var(--primary))"
                    strokeWidth={3 / zoom}
                    lineCap="round"
                    lineJoin="round"
                    dash={[6 / zoom, 3 / zoom]}
                  />
                )}
                {activeMeasurementPoints.map((c, i) => (
                  <Circle key={i} x={c.x} y={c.y} radius={5 / zoom} fill="hsl(var(--primary))" stroke="white" strokeWidth={2 / zoom} />
                ))}
              </Group>
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
