import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle, Text } from 'react-konva';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Ruler, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight,
  Crosshair, CheckCircle2, AlertTriangle, Loader2, Hand,
} from 'lucide-react';
import { usePdfRenderer } from '@/hooks/usePdfRenderer';
import { useSignedUrl } from '@/hooks/useSignedUrl';

export type CalibrationMethod = 'known_distance' | 'declared_scale' | 'uncalibrated';
export type CalibrationConfidence = 'alta' | 'media' | 'baixa';

export interface CalibrationPayload {
  method: CalibrationMethod;
  point_a?: { x: number; y: number } | null;
  point_b?: { x: number; y: number } | null;
  distance_px?: number | null;
  real_distance_m?: number | null;
  declared_scale?: string | null;
  confidence: CalibrationConfidence;
  page: number;
  scale_m_per_px: number | null;
  override: boolean;
}

interface Props {
  filePath: string;
  initialPage?: number;
  initial?: Partial<CalibrationPayload>;
  onConfirm: (p: CalibrationPayload) => void;
  isSaving?: boolean;
}

const DECLARED_SCALES: Record<string, number> = {
  '1:50': 0.05,
  '1:100': 0.1,
  '1:200': 0.2,
};

const MAX_VIEW_W = 900;
const MAX_VIEW_H = 620;

export function IcfPlanCalibrator({ filePath, initialPage = 1, initial, onConfirm, isSaving }: Props) {
  const isPdf = filePath.toLowerCase().endsWith('.pdf');
  const { signedUrl } = useSignedUrl('plan-files', filePath, 3600);
  const [page, setPage] = useState(initial?.page ?? initialPage);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<'measure' | 'pan'>('measure');
  const [isDragging, setIsDragging] = useState(false);
  const [spacePan, setSpacePan] = useState(false);

  const pdf = usePdfRenderer({ url: isPdf ? signedUrl : null, page, scale: 2 });

  // Carrega imagem para o Konva (imagem direta OU dataURL do pdf-renderer)
  useEffect(() => {
    const src = isPdf ? pdf.imageDataUrl : signedUrl;
    if (!src) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgEl(img);
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = src;
  }, [isPdf, pdf.imageDataUrl, signedUrl]);

  // Calcula escala-base para caber no viewport
  const fitScale = useMemo(() => {
    if (!imgDims.w || !imgDims.h) return 1;
    return Math.min(MAX_VIEW_W / imgDims.w, MAX_VIEW_H / imgDims.h, 1);
  }, [imgDims]);

  const stageScale = fitScale * zoom;
  const viewW = imgDims.w * stageScale;
  const viewH = imgDims.h * stageScale;

  // Estado de calibração (pontos guardados em coordenadas da imagem original)
  const [method, setMethod] = useState<CalibrationMethod>(initial?.method ?? 'known_distance');
  const [pointA, setPointA] = useState<{ x: number; y: number } | null>(initial?.point_a ?? null);
  const [pointB, setPointB] = useState<{ x: number; y: number } | null>(initial?.point_b ?? null);
  const [realDist, setRealDist] = useState<string>(initial?.real_distance_m ? String(initial.real_distance_m) : '');
  const [unit, setUnit] = useState<'m' | 'cm' | 'mm'>('m');
  const [declaredScale, setDeclaredScale] = useState<string>(initial?.declared_scale ?? '1:100');
  const [customMpp, setCustomMpp] = useState<string>('');
  const [override, setOverride] = useState<boolean>(initial?.override ?? false);
  const [error, setError] = useState<string | null>(null);

  const distancePx = useMemo(() => {
    if (!pointA || !pointB) return null;
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, [pointA, pointB]);

  const realDistanceM = useMemo(() => {
    const n = parseFloat(realDist);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (unit === 'cm') return n / 100;
    if (unit === 'mm') return n / 1000;
    return n;
  }, [realDist, unit]);

  const computedMpp = useMemo(() => {
    if (method === 'known_distance') {
      if (!distancePx || distancePx < 5 || !realDistanceM) return null;
      return realDistanceM / distancePx;
    }
    if (method === 'declared_scale') {
      if (declaredScale === 'custom') {
        const n = parseFloat(customMpp);
        return Number.isFinite(n) && n > 0 ? n : null;
      }
      // m/px assumindo render @ ~96 dpi → 1 px ≈ 0.0002645 m no real;
      // como visualizamos numa resolução variável, usamos a relação relativa do PDF:
      // o utilizador é avisado de que esta calibração é apenas indicativa.
      const ratio = DECLARED_SCALES[declaredScale];
      if (!ratio || !imgDims.w) return null;
      // Heurística: assume 1 m no desenho = ratio (1:100 ⇒ 0.01 m no papel ⇒ 1 m real = 100 px @ 96dpi).
      // Mantemos um valor neutro: 1/100 mapeia 1m → 100 px na imagem renderizada.
      return ratio / 100;
    }
    return null;
  }, [method, distancePx, realDistanceM, declaredScale, customMpp, imgDims.w]);

  const stageState: 'aguardando_primeiro_ponto' | 'aguardando_segundo_ponto' | 'aguardando_medida_real' | 'calibrado' | 'erro_calibracao' = useMemo(() => {
    if (method !== 'known_distance') return computedMpp ? 'calibrado' : 'aguardando_medida_real';
    if (!pointA) return 'aguardando_primeiro_ponto';
    if (!pointB) return 'aguardando_segundo_ponto';
    if (!realDistanceM) return 'aguardando_medida_real';
    if (distancePx && distancePx < 5) return 'erro_calibracao';
    return 'calibrado';
  }, [method, pointA, pointB, realDistanceM, distancePx, computedMpp]);

  const handleStageClick = (e: any) => {
    if (method !== 'known_distance') return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    // Converter para coordenadas da imagem original (independente de zoom/pan)
    const x = (pos.x - pan.x) / stageScale;
    const y = (pos.y - pan.y) / stageScale;
    if (x < 0 || y < 0 || x > imgDims.w || y > imgDims.h) return;
    const p = { x, y };
    if (!pointA) {
      setPointA(p);
      setPointB(null);
      setError(null);
    } else if (!pointB) {
      const dx = p.x - pointA.x;
      const dy = p.y - pointA.y;
      if (Math.sqrt(dx * dx + dy * dy) < 5) {
        setError('Os dois pontos estão demasiado próximos.');
        return;
      }
      setPointB(p);
      setError(null);
    } else {
      setPointA(p);
      setPointB(null);
    }
  };

  const handleReset = () => {
    setPointA(null);
    setPointB(null);
    setRealDist('');
    setError(null);
  };

  const handleConfirm = () => {
    if (override) {
      onConfirm({
        method: 'uncalibrated',
        confidence: 'baixa',
        page,
        scale_m_per_px: null,
        override: true,
      });
      return;
    }
    if (method === 'known_distance') {
      if (!pointA || !pointB || !realDistanceM || !distancePx || !computedMpp) {
        setError('Complete os dois pontos e a medida real.');
        return;
      }
      onConfirm({
        method: 'known_distance',
        point_a: pointA,
        point_b: pointB,
        distance_px: distancePx,
        real_distance_m: realDistanceM,
        confidence: 'alta',
        page,
        scale_m_per_px: computedMpp,
        override: false,
      });
      return;
    }
    if (method === 'declared_scale') {
      if (!computedMpp) {
        setError('Indique uma escala válida.');
        return;
      }
      onConfirm({
        method: 'declared_scale',
        declared_scale: declaredScale === 'custom' ? `m/px=${customMpp}` : declaredScale,
        confidence: 'media',
        page,
        scale_m_per_px: computedMpp,
        override: false,
      });
    }
  };

  // Pontos em coordenadas de ecrã
  const pa = pointA ? { x: pointA.x * stageScale + pan.x, y: pointA.y * stageScale + pan.y } : null;
  const pb = pointB ? { x: pointB.x * stageScale + pan.x, y: pointB.y * stageScale + pan.y } : null;

  const loading = isPdf ? (pdf.isRendering || !imgEl) : !imgEl;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <Card className="rounded-xl overflow-hidden">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" /> Visualização da planta
            </CardTitle>
            {isPdf && pdf.totalPages > 1 && (
              <Badge variant="outline" className="text-[10px]">
                Página {page} / {pdf.totalPages}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isPdf && pdf.totalPages > 1 && (
              <>
                <Button size="icon" variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setPage((p) => Math.min(pdf.totalPages, p + 1))} disabled={page >= pdf.totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.min(z * 1.25, 6))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.max(z / 1.25, 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-muted/40">
          <div
            className="relative w-full overflow-hidden"
            style={{ height: MAX_VIEW_H }}
          >
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> A carregar planta…
              </div>
            ) : (
              <Stage
                width={MAX_VIEW_W}
                height={MAX_VIEW_H}
                onClick={handleStageClick}
                onWheel={(e) => {
                  e.evt.preventDefault();
                  const dir = e.evt.deltaY > 0 ? 1 / 1.1 : 1.1;
                  setZoom((z) => Math.min(Math.max(z * dir, 0.25), 6));
                }}
                draggable={method !== 'known_distance' || (!!pointA && !!pointB)}
                onDragEnd={(e) => setPan({ x: e.target.x(), y: e.target.y() })}
                x={pan.x}
                y={pan.y}
                style={{ cursor: method === 'known_distance' ? 'crosshair' : 'grab' }}
              >
                <Layer>
                  {imgEl && (
                    <KonvaImage
                      image={imgEl}
                      width={viewW}
                      height={viewH}
                    />
                  )}
                  {pa && pb && (
                    <Line
                      points={[pa.x - pan.x, pa.y - pan.y, pb.x - pan.x, pb.y - pan.y]}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dash={[6, 4]}
                    />
                  )}
                  {pa && (
                    <Circle x={pa.x - pan.x} y={pa.y - pan.y} radius={6} fill="hsl(var(--primary))" stroke="white" strokeWidth={2} />
                  )}
                  {pb && (
                    <Circle x={pb.x - pan.x} y={pb.y - pan.y} radius={6} fill="hsl(var(--primary))" stroke="white" strokeWidth={2} />
                  )}
                  {pa && pb && distancePx && (
                    <Text
                      x={(pa.x + pb.x) / 2 - pan.x}
                      y={(pa.y + pb.y) / 2 - pan.y - 18}
                      text={`${distancePx.toFixed(0)} px${realDistanceM ? ` · ${realDistanceM.toFixed(2)} m` : ''}`}
                      fontSize={12}
                      fill="hsl(var(--primary))"
                      padding={4}
                    />
                  )}
                </Layer>
              </Stage>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-primary" /> Calibração da escala
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Método de calibração</Label>
            <Select value={method} onValueChange={(v) => { setMethod(v as CalibrationMethod); handleReset(); }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="known_distance">Medida conhecida (recomendado)</SelectItem>
                <SelectItem value="declared_scale">Escala declarada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method === 'known_distance' && (
            <>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
                <li>Escolha uma medida conhecida (ex: cota).</li>
                <li>Clique no primeiro ponto.</li>
                <li>Clique no segundo ponto.</li>
                <li>Informe a medida real.</li>
                <li>Confirme a calibração.</li>
              </ol>

              <div className="flex items-center gap-2">
                <Badge variant={pointA ? 'default' : 'secondary'} className="text-[10px]">A {pointA ? '✓' : '…'}</Badge>
                <Badge variant={pointB ? 'default' : 'secondary'} className="text-[10px]">B {pointB ? '✓' : '…'}</Badge>
                {distancePx && <span className="text-xs text-muted-foreground">{distancePx.toFixed(0)} px</span>}
              </div>

              {pointA && pointB && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Distância real</Label>
                    <Input
                      type="number" step="0.01" min="0.01" placeholder="Ex: 6.00"
                      value={realDist} onChange={(e) => setRealDist(e.target.value)} autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unidade</Label>
                    <Select value={unit} onValueChange={(v) => setUnit(v as any)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m">m</SelectItem>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="mm">mm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Button variant="outline" size="sm" className="w-full" onClick={handleReset}>
                <RotateCcw className="h-3 w-3 mr-1" /> Limpar pontos
              </Button>
            </>
          )}

          {method === 'declared_scale' && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  A escala declarada só é confiável se o PDF não foi redimensionado.
                  Para maior precisão, use a calibração por medida conhecida.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label className="text-xs">Escala</Label>
                <Select value={declaredScale} onValueChange={setDeclaredScale}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:50">1:50</SelectItem>
                    <SelectItem value="1:100">1:100</SelectItem>
                    <SelectItem value="1:200">1:200</SelectItem>
                    <SelectItem value="custom">Personalizada (m/px)</SelectItem>
                  </SelectContent>
                </Select>
                {declaredScale === 'custom' && (
                  <Input
                    type="number" step="0.0001" placeholder="m/px"
                    value={customMpp} onChange={(e) => setCustomMpp(e.target.value)}
                  />
                )}
              </div>
            </>
          )}

          <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado:</span>
              <Badge variant={stageState === 'calibrado' ? 'default' : 'secondary'} className="text-[10px]">
                {stageState}
              </Badge>
            </div>
            {computedMpp && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">m/pixel:</span>
                  <span className="font-mono">{computedMpp.toFixed(5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">px/m:</span>
                  <span className="font-mono">{(1 / computedMpp).toFixed(1)}</span>
                </div>
              </>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="override-cal" className="text-xs cursor-pointer">
                Continuar sem calibração precisa
              </Label>
              <Switch id="override-cal" checked={override} onCheckedChange={setOverride} />
            </div>
            {override && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Sem calibração as medições podem ficar incorretas. A Axia marcará os
                  quantitativos como baixa confiança e exigirá revisão humana.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleConfirm}
            disabled={isSaving || (!override && stageState !== 'calibrado')}
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Confirmar calibração
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
