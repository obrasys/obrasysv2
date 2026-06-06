import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Line as KLine, Rect } from 'react-konva';
import DxfParser from 'dxf-parser';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ZoomIn, ZoomOut, Maximize2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { humanizeError } from '@/lib/plan-error-messages';

interface DxfPreviewDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filePath: string | null;
  onConfirm: () => void;
}

type Seg = { points: number[]; layer: string };

// Paleta consistente por classe de layer (mantemos tokens HSL via style inline simples)
function colorForLayer(layer: string): string {
  const l = layer.toLowerCase();
  if (/(wall|parede|icf|muro|alvenaria)/.test(l)) return 'hsl(var(--primary))';
  if (/(door|porta)/.test(l)) return 'hsl(25 90% 55%)';
  if (/(window|janela|vao)/.test(l)) return 'hsl(200 80% 50%)';
  if (/(fund|sapata|footing)/.test(l)) return 'hsl(280 60% 55%)';
  if (/(laje|slab)/.test(l)) return 'hsl(150 50% 45%)';
  if (/(dim|cota)/.test(l)) return 'hsl(var(--muted-foreground))';
  if (/(pilar|viga|column|beam|estrutura|structure)/.test(l)) return 'hsl(0 70% 55%)';
  return 'hsl(var(--foreground) / 0.55)';
}

function extractRawSegments(entities: any[]): Seg[] {
  const out: Seg[] = [];
  for (const e of entities ?? []) {
    const layer = e.layer || '0';
    if (e.type === 'LINE' && e.vertices?.length >= 2) {
      out.push({
        points: [e.vertices[0].x, e.vertices[0].y, e.vertices[1].x, e.vertices[1].y],
        layer,
      });
    } else if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && Array.isArray(e.vertices)) {
      const v = e.vertices;
      for (let i = 0; i < v.length - 1; i++) {
        out.push({ points: [v[i].x, v[i].y, v[i + 1].x, v[i + 1].y], layer });
      }
      if (e.shape && v.length > 2) {
        out.push({
          points: [v[v.length - 1].x, v[v.length - 1].y, v[0].x, v[0].y],
          layer,
        });
      }
    } else if (e.type === 'CIRCLE' && typeof e.x === 'number') {
      // Aproximação de círculo como 24 segmentos
      const cx = e.x, cy = e.y, r = e.radius ?? 0;
      const steps = 24;
      for (let i = 0; i < steps; i++) {
        const a1 = (i / steps) * Math.PI * 2;
        const a2 = ((i + 1) / steps) * Math.PI * 2;
        out.push({
          points: [cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2)],
          layer,
        });
      }
    } else if (e.type === 'ARC' && typeof e.x === 'number') {
      const cx = e.x, cy = e.y, r = e.radius ?? 0;
      const a0 = ((e.startAngle ?? 0) * Math.PI) / 180;
      const a1 = ((e.endAngle ?? 0) * Math.PI) / 180;
      let span = a1 - a0;
      if (span <= 0) span += Math.PI * 2;
      const steps = Math.max(8, Math.ceil((span / (Math.PI * 2)) * 32));
      for (let i = 0; i < steps; i++) {
        const t0 = a0 + (span * i) / steps;
        const t1 = a0 + (span * (i + 1)) / steps;
        out.push({
          points: [cx + r * Math.cos(t0), cy + r * Math.sin(t0), cx + r * Math.cos(t1), cy + r * Math.sin(t1)],
          layer,
        });
      }
    }
  }
  return out;
}

export function DxfPreviewDialog({ open, onOpenChange, filePath, onConfirm }: DxfPreviewDialogProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [segments, setSegments] = useState<Seg[]>([]);
  const [bbox, setBbox] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  const [detectedUnit, setDetectedUnit] = useState<string>('?');
  const [layerCounts, setLayerCounts] = useState<Record<string, number>>({});
  const [stageSize, setStageSize] = useState({ w: 800, h: 480 });
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // Carregar e parsear o DXF quando o diálogo abre
  useEffect(() => {
    if (!open || !filePath) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setSegments([]);
      setBbox(null);
      try {
        const { data, error } = await supabase.storage.from('plan-files').download(filePath);
        if (error || !data) throw error || new Error('Ficheiro não encontrado');
        const text = await data.text();
        const parser = new (DxfParser as any)();
        const dxf = parser.parseSync(text);
        if (cancelled) return;
        const ins = dxf?.header?.$INSUNITS;
        const unitMap: Record<number, string> = { 1: 'in', 4: 'mm', 5: 'cm', 6: 'm', 14: 'dm' };
        setDetectedUnit(ins != null ? (unitMap[ins] ?? `código ${ins}`) : 'não declarada');
        const segs = extractRawSegments(dxf?.entities ?? []);
        setSegments(segs);
        const counts: Record<string, number> = {};
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const s of segs) {
          counts[s.layer] = (counts[s.layer] ?? 0) + 1;
          for (let i = 0; i < s.points.length; i += 2) {
            const x = s.points[i], y = s.points[i + 1];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
        setLayerCounts(counts);
        if (Number.isFinite(minX) && Number.isFinite(maxX)) {
          setBbox({ minX, minY, maxX, maxY });
        }
      } catch (err: any) {
        toast(humanizeError(err, {
          title: 'Não foi possível pré-visualizar',
          description: 'Verifique se o ficheiro é um DXF válido.',
          variant: 'destructive',
        }));
        onOpenChange(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, filePath]);

  // Medir contentor para o Stage
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setStageSize({ w: el.clientWidth, h: Math.max(360, Math.min(560, el.clientWidth * 0.6)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  // Fit-to-view inicial sempre que bbox/stageSize mudam
  const fitToView = () => {
    if (!bbox) return;
    const pad = 24;
    const w = bbox.maxX - bbox.minX || 1;
    const h = bbox.maxY - bbox.minY || 1;
    const s = Math.min((stageSize.w - pad * 2) / w, (stageSize.h - pad * 2) / h);
    const safe = Number.isFinite(s) && s > 0 ? s : 1;
    setScale(safe);
    // Centrar: Konva tem Y para baixo; DXF tem Y para cima → invertemos em scaleY
    const cx = (bbox.minX + bbox.maxX) / 2;
    const cy = (bbox.minY + bbox.maxY) / 2;
    setPos({
      x: stageSize.w / 2 - cx * safe,
      y: stageSize.h / 2 + cy * safe,
    });
  };

  useEffect(() => {
    fitToView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bbox, stageSize.w, stageSize.h]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - pos.x) / oldScale,
      y: (pointer.y - pos.y) / -oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const factor = 1.15;
    const newScale = direction > 0 ? oldScale * factor : oldScale / factor;
    const clamped = Math.max(0.0001, Math.min(newScale, 1_000_000));
    setScale(clamped);
    setPos({
      x: pointer.x - mousePointTo.x * clamped,
      y: pointer.y + mousePointTo.y * clamped,
    });
  };

  const zoomBy = (factor: number) => {
    const newScale = Math.max(0.0001, Math.min(scale * factor, 1_000_000));
    const cx = stageSize.w / 2;
    const cy = stageSize.h / 2;
    const worldX = (cx - pos.x) / scale;
    const worldY = (cy - pos.y) / -scale;
    setScale(newScale);
    setPos({
      x: cx - worldX * newScale,
      y: cy + worldY * newScale,
    });
  };

  const topLayers = useMemo(
    () =>
      Object.entries(layerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
    [layerCounts],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Pré-visualização do DXF
          </DialogTitle>
          <DialogDescription>
            Use a roda do rato para zoom e arraste para deslocar. Valide visualmente antes de avançar para a análise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">Unidade: {detectedUnit}</Badge>
            <Badge variant="outline">{segments.length} segmentos</Badge>
            {bbox && (
              <Badge variant="outline">
                bbox: {(bbox.maxX - bbox.minX).toFixed(1)} × {(bbox.maxY - bbox.minY).toFixed(1)} (un. ficheiro)
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => zoomBy(1 / 1.3)} disabled={isLoading}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => zoomBy(1.3)} disabled={isLoading}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={fitToView} disabled={isLoading}>
                <Maximize2 className="h-4 w-4 mr-1" /> Ajustar
              </Button>
            </div>
          </div>

          <div
            ref={containerRef}
            className="relative w-full rounded-md border bg-muted/30 overflow-hidden"
            style={{ height: stageSize.h }}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground gap-2 bg-background/60 z-10">
                <Loader2 className="h-5 w-5 animate-spin" /> A ler ficheiro DXF...
              </div>
            )}
            {!isLoading && segments.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Nenhuma geometria reconhecida neste DXF.
              </div>
            )}
            <Stage
              width={stageSize.w}
              height={stageSize.h}
              onWheel={handleWheel}
              draggable
              x={pos.x}
              y={pos.y}
              scaleX={scale}
              scaleY={-scale}
              onDragEnd={(e) => setPos({ x: e.target.x(), y: e.target.y() })}
            >
              <Layer listening={false}>
                {bbox && (
                  <Rect
                    x={bbox.minX}
                    y={bbox.minY}
                    width={bbox.maxX - bbox.minX}
                    height={bbox.maxY - bbox.minY}
                    stroke="hsl(var(--border))"
                    strokeWidth={1 / Math.max(scale, 0.0001)}
                    dash={[6 / Math.max(scale, 0.0001), 6 / Math.max(scale, 0.0001)]}
                  />
                )}
                {segments.map((s, i) => (
                  <KLine
                    key={i}
                    points={s.points}
                    stroke={colorForLayer(s.layer)}
                    strokeWidth={1 / Math.max(scale, 0.0001)}
                    listening={false}
                    perfectDrawEnabled={false}
                  />
                ))}
              </Layer>
            </Stage>
          </div>

          {topLayers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {topLayers.map(([layer, count]) => (
                <span
                  key={layer}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: colorForLayer(layer) }}
                  />
                  {layer} <span className="text-muted-foreground">({count})</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
            disabled={isLoading || segments.length === 0}
          >
            Confirmar e analisar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
