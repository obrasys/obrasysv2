import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Box } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

export interface IsometricPanelInput {
  id: string;
  label: string;
  length_m: number;
  height_m: number;
  /** N | S | E | W. Se omitido, é inferido do label (sufixo -N/-E/-S/-W). */
  orientation?: 'N' | 'S' | 'E' | 'W' | null;
  /** Piso/nível (string). Panos no mesmo piso ficam empilhados no mesmo nível. */
  floor?: string | null;
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

type Orient = 'N' | 'S' | 'E' | 'W';
const ORIENTS: Orient[] = ['N', 'E', 'S', 'W'];

function inferOrientation(label: string): Orient | null {
  const m = label?.toUpperCase().match(/[-_ ]([NSEW])(?:[^A-Z]|$)/);
  if (m) return m[1] as Orient;
  // fallback: try last char if alone
  const last = label?.toUpperCase().trim().slice(-1);
  if (last && ORIENTS.includes(last as Orient)) return last as Orient;
  return null;
}

/** Projeção isométrica 30°: (x, y, z) world → (sx, sy) screen */
function iso(x: number, y: number, z: number, scale: number) {
  const cos = Math.cos(Math.PI / 6);
  const sin = Math.sin(Math.PI / 6);
  return {
    x: (x - z) * cos * scale,
    y: (x + z) * sin * scale - y * scale,
  };
}

export function IcfPanelsIsometric({
  panels,
  title = 'Vista Isométrica',
  emptyHint = 'Adicione panos para visualizar o modelo isométrico esquemático.',
}: Props) {
  const [mode, setMode] = useState<'assembled' | 'spread'>('assembled');

  const enriched = useMemo(
    () =>
      (panels ?? []).map(p => ({
        ...p,
        orientation: p.orientation ?? inferOrientation(p.label),
        floor: p.floor ?? '0',
      })),
    [panels],
  );

  const hasOrient = enriched.some(p => p.orientation);

  if (!panels || panels.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Box className="h-4 w-4 text-primary" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">{emptyHint}</CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Box className="h-4 w-4 text-primary" /> {title}
          <span className="text-xs font-normal text-muted-foreground ml-1">({panels.length} panos)</span>
        </CardTitle>
        {hasOrient && (
          <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-0.5">
            <Button
              size="sm"
              variant={mode === 'assembled' ? 'default' : 'ghost'}
              className="h-7 px-2 text-xs"
              onClick={() => setMode('assembled')}
            >
              Edifício
            </Button>
            <Button
              size="sm"
              variant={mode === 'spread' ? 'default' : 'ghost'}
              className="h-7 px-2 text-xs"
              onClick={() => setMode('spread')}
            >
              Lista
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        {mode === 'assembled' && hasOrient ? (
          <AssembledBuilding panels={enriched} />
        ) : (
          <SpreadList panels={enriched} />
        )}
        <p className="text-xs text-muted-foreground italic mt-3">
          Modelo isométrico esquemático - representação visual sem precisão construtiva.
          {hasOrient && mode === 'assembled' && ' Panos agrupados por orientação (N/E/S/W) e piso.'}
        </p>
      </CardContent>
    </Card>
  );
}

// ============== Vista 1: Edifício montado ==============

function AssembledBuilding({ panels }: { panels: IsometricPanelInput[] }) {
  const stroke = 'hsl(var(--primary))';
  const fillN = 'hsl(var(--primary) / 0.18)'; // fundo
  const fillS = 'hsl(var(--primary) / 0.30)'; // frente
  const fillE = 'hsl(var(--primary) / 0.42)'; // direita (mais escura)
  const fillW = 'hsl(var(--primary) / 0.12)'; // esquerda (mais clara)
  const fillRoof = 'hsl(var(--primary) / 0.08)';

  // Agrupar por piso → orientação
  const floors = Array.from(new Set(panels.map(p => p.floor ?? '0')));
  // Ordenar pisos: numérico onde possível
  floors.sort((a, b) => {
    const na = parseFloat(a ?? '0');
    const nb = parseFloat(b ?? '0');
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });

  // Dimensões da planta (footprint) = soma dos comprimentos por orientação no piso de maior dimensão
  const sumByOrient = (floor: string, o: Orient) =>
    panels.filter(p => (p.floor ?? '0') === floor && p.orientation === o).reduce((s, p) => s + p.length_m, 0);

  // largura X = max(N, S); profundidade Z = max(E, W)
  const widthX = Math.max(...floors.map(f => Math.max(sumByOrient(f, 'N'), sumByOrient(f, 'S'))), 4);
  const depthZ = Math.max(...floors.map(f => Math.max(sumByOrient(f, 'E'), sumByOrient(f, 'W'))), 3);

  // Altura por piso = max altura dos panos desse piso
  const floorHeights = floors.map(f =>
    Math.max(...panels.filter(p => (p.floor ?? '0') === f).map(p => p.height_m), 2.7),
  );

  const scale = 28;
  // calcular bounding box em coords isométricas
  const totalHeight = floorHeights.reduce((s, h) => s + h, 0);
  const corners = [
    iso(0, 0, 0, scale),
    iso(widthX, 0, 0, scale),
    iso(widthX, 0, depthZ, scale),
    iso(0, 0, depthZ, scale),
    iso(0, totalHeight, 0, scale),
    iso(widthX, totalHeight, 0, scale),
    iso(widthX, totalHeight, depthZ, scale),
    iso(0, totalHeight, depthZ, scale),
  ];
  const minX = Math.min(...corners.map(c => c.x));
  const maxX = Math.max(...corners.map(c => c.x));
  const minY = Math.min(...corners.map(c => c.y));
  const maxY = Math.max(...corners.map(c => c.y));
  const pad = 40;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;
  const offX = -minX + pad;
  const offY = -minY + pad;

  const P = (x: number, y: number, z: number) => {
    const p = iso(x, y, z, scale);
    return `${p.x + offX},${p.y + offY}`;
  };

  // Render por piso (de baixo para cima)
  let yCursor = 0;
  const floorLayers = floors.map((floor, idx) => {
    const fh = floorHeights[idx];
    const y0 = yCursor;
    const y1 = yCursor + fh;
    yCursor = y1;

    // Acumular panos ao longo de cada parede
    const layoutWall = (o: Orient) => {
      const wallPanels = panels.filter(p => (p.floor ?? '0') === floor && p.orientation === o);
      let cursor = 0;
      return wallPanels.map(p => {
        const start = cursor;
        cursor += p.length_m;
        return { panel: p, start, end: cursor };
      });
    };
    const wallS = layoutWall('S'); // frente, z = depthZ, x = start..end
    const wallN = layoutWall('N'); // fundo, z = 0
    const wallE = layoutWall('E'); // direita, x = widthX, z = start..end
    const wallW = layoutWall('W'); // esquerda, x = 0

    return { floor, y0, y1, wallS, wallN, wallE, wallW };
  });

  // ordem de desenho: fundo→frente para overlap correto
  return (
    <div className="overflow-x-auto rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 p-4">
      <svg viewBox={`0 0 ${vbW} ${vbH}`} width="100%" style={{ maxHeight: 540, minWidth: Math.min(vbW, 900) }}>
        {/* chão */}
        <polygon
          points={`${P(0, 0, 0)} ${P(widthX, 0, 0)} ${P(widthX, 0, depthZ)} ${P(0, 0, depthZ)}`}
          fill="hsl(var(--muted) / 0.4)"
          stroke="hsl(var(--border))"
          strokeWidth={0.6}
          strokeDasharray="2 3"
        />

        {floorLayers.map(layer => (
          <g key={layer.floor}>
            {/* Parede N (fundo) - desenhada primeiro */}
            {layer.wallN.map(({ panel, start, end }) => {
              const pts = `${P(start, layer.y0, 0)} ${P(end, layer.y0, 0)} ${P(end, layer.y1, 0)} ${P(start, layer.y1, 0)}`;
              return (
                <polygon key={`N-${panel.id}`} points={pts} fill={fillN} stroke={stroke} strokeWidth={0.9} />
              );
            })}
            {/* Parede W (esquerda) */}
            {layer.wallW.map(({ panel, start, end }) => {
              const pts = `${P(0, layer.y0, start)} ${P(0, layer.y0, end)} ${P(0, layer.y1, end)} ${P(0, layer.y1, start)}`;
              return (
                <polygon key={`W-${panel.id}`} points={pts} fill={fillW} stroke={stroke} strokeWidth={0.9} />
              );
            })}
            {/* Parede E (direita) */}
            {layer.wallE.map(({ panel, start, end }) => {
              const pts = `${P(widthX, layer.y0, start)} ${P(widthX, layer.y0, end)} ${P(widthX, layer.y1, end)} ${P(widthX, layer.y1, start)}`;
              return (
                <polygon key={`E-${panel.id}`} points={pts} fill={fillE} stroke={stroke} strokeWidth={0.9} />
              );
            })}
            {/* Parede S (frente) - última */}
            {layer.wallS.map(({ panel, start, end }) => {
              const pts = `${P(start, layer.y0, depthZ)} ${P(end, layer.y0, depthZ)} ${P(end, layer.y1, depthZ)} ${P(start, layer.y1, depthZ)}`;
              return (
                <polygon key={`S-${panel.id}`} points={pts} fill={fillS} stroke={stroke} strokeWidth={0.9} />
              );
            })}
            {/* etiqueta piso à esquerda */}
            <text
              x={P(0, (layer.y0 + layer.y1) / 2, depthZ).split(',')[0]}
              y={P(0, (layer.y0 + layer.y1) / 2, depthZ).split(',')[1]}
              fontSize="9"
              fill="hsl(var(--muted-foreground))"
              transform={`translate(-14, 3)`}
            >
              {layer.floor}
            </text>
          </g>
        ))}

        {/* topo (cobertura) */}
        <polygon
          points={`${P(0, totalHeight, 0)} ${P(widthX, totalHeight, 0)} ${P(widthX, totalHeight, depthZ)} ${P(0, totalHeight, depthZ)}`}
          fill={fillRoof}
          stroke={stroke}
          strokeWidth={0.9}
        />

        {/* legenda orientação */}
        <g transform={`translate(${vbW - 110}, ${vbH - 60})`} fontSize="9" fill="hsl(var(--muted-foreground))">
          <text x={50} y={0} textAnchor="middle" fontWeight="600">N</text>
          <text x={50} y={56} textAnchor="middle" fontWeight="600">S</text>
          <text x={0} y={30} textAnchor="end" fontWeight="600">W</text>
          <text x={100} y={30} fontWeight="600">E</text>
          <circle cx={50} cy={28} r={3} fill={stroke} />
        </g>
      </svg>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        {ORIENTS.map(o => {
          const count = panels.filter(p => p.orientation === o).length;
          return (
            <div key={o} className="flex items-center gap-2 rounded-md border bg-card/60 px-2 py-1">
              <span className="font-semibold text-primary">{o}</span>
              <span className="text-muted-foreground">{count} panos</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============== Vista 2: Lista lado-a-lado (fallback) ==============

function SpreadList({ panels }: { panels: IsometricPanelInput[] }) {
  const scale = 30;
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
              <text x={fx + 4} y={yBase + 14} fontSize="10" fill="hsl(var(--muted-foreground))">
                {p.label} · {p.length_m.toFixed(1)}×{p.height_m.toFixed(1)} m
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
