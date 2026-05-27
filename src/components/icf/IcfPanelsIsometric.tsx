import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Box } from 'lucide-react';

export interface IsometricPanelInput {
  id: string;
  label: string;
  length_m: number;
  height_m: number;
  openings?: Array<{
    width_m: number;
    height_m: number;
    position_m?: number;
    sill_height_m?: number;
  }>;
}

interface Props {
  panels: IsometricPanelInput[];
  title?: string;
  emptyHint?: string;
}

/**
 * Vista isométrica esquemática reutilizável.
 * Representa cada pano como paralelepípedo projetado a 30°. Não é geometria construtiva real.
 */
export function IcfPanelsIsometric({
  panels,
  title = 'Vista Isométrica',
  emptyHint = 'Adicione panos para visualizar o modelo isométrico esquemático.',
}: Props) {
  if (!panels || panels.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Box className="h-4 w-4 text-primary" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {emptyHint}
        </CardContent>
      </Card>
    );
  }

  const scale = 30; // px por metro
  const depth = 0.25 * scale;
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);
  let cursorX = 20;
  const padding = 30;

  const items = panels.map(p => {
    const w = Math.max(0.5, p.length_m) * scale;
    const h = Math.max(0.5, p.height_m) * scale;
    const item = { panel: p, x: cursorX, w, h };
    cursorX += w * cos30 + depth * cos30 + 20;
    return item;
  });

  const totalW = cursorX + padding;
  const maxH = Math.max(...items.map(i => i.h)) + depth * sin30 * 2 + padding * 2;

  const isFill = 'hsl(var(--primary) / 0.15)';
  const isFillTop = 'hsl(var(--primary) / 0.3)';
  const isFillSide = 'hsl(var(--primary) / 0.45)';
  const isStroke = 'hsl(var(--primary))';

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Box className="h-4 w-4 text-primary" /> {title}
          <span className="text-xs font-normal text-muted-foreground ml-1">({panels.length} panos)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="overflow-x-auto rounded-lg bg-muted/20 p-4">
          <svg viewBox={`0 0 ${totalW} ${maxH}`} width="100%" style={{ minWidth: totalW, maxHeight: 480 }}>
            {items.map(({ panel: p, x, w, h }) => {
              const yBase = maxH - padding;
              const fx = x;
              const fy = yBase - h;
              const dx = depth * cos30;
              const dy = -depth * sin30;
              const front = `${fx},${fy} ${fx + w * cos30},${fy - w * sin30} ${fx + w * cos30},${yBase - w * sin30} ${fx},${yBase}`;
              const top = `${fx},${fy} ${fx + dx},${fy + dy} ${fx + w * cos30 + dx},${fy - w * sin30 + dy} ${fx + w * cos30},${fy - w * sin30}`;
              const side = `${fx + w * cos30},${fy - w * sin30} ${fx + w * cos30 + dx},${fy - w * sin30 + dy} ${fx + w * cos30 + dx},${yBase - w * sin30 + dy} ${fx + w * cos30},${yBase - w * sin30}`;
              return (
                <g key={p.id}>
                  <polygon points={top} fill={isFillTop} stroke={isStroke} strokeWidth={0.8} />
                  <polygon points={side} fill={isFillSide} stroke={isStroke} strokeWidth={0.8} />
                  <polygon points={front} fill={isFill} stroke={isStroke} strokeWidth={1} />
                  {(p.openings ?? []).map((o, i) => {
                    const ow = Number(o.width_m) * scale * cos30;
                    const oh = Number(o.height_m) * scale;
                    const ox = fx + (Number(o.position_m) || 0.2) * scale * cos30;
                    const oy = yBase - oh - (Number(o.sill_height_m) || 0) * scale;
                    return (
                      <rect key={i} x={ox} y={oy} width={ow} height={oh}
                        fill="hsl(var(--background))" stroke={isStroke} strokeWidth={0.6} />
                    );
                  })}
                  <text x={fx + 4} y={yBase + 14} fontSize="10" fill="hsl(var(--muted-foreground))">
                    {p.label} · {p.length_m.toFixed(1)}×{p.height_m.toFixed(1)} m
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="text-xs text-muted-foreground italic mt-3">
          Modelo isométrico esquemático — representação visual sem precisão construtiva.
        </p>
      </CardContent>
    </Card>
  );
}
