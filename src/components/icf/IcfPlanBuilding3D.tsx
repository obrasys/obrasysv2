import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Loader2, Info } from 'lucide-react';
import { usePlanImports } from '@/hooks/usePlanImports';
import { usePlanWalls } from '@/hooks/usePlanWalls';
import { usePlanOpenings } from '@/hooks/usePlanOpenings';
import { usePlanRooms } from '@/hooks/usePlanRooms';

interface Props {
  obraId: string;
  defaultHeightM?: number;
}

/** Projeção isométrica 30°: world (x,y,z) → screen (sx,sy). y é altura. */
function iso(x: number, y: number, z: number, scale: number) {
  const c = Math.cos(Math.PI / 6);
  const s = Math.sin(Math.PI / 6);
  return { x: (x - z) * c * scale, y: (x + z) * s * scale - y * scale };
}

export function IcfPlanBuilding3D({ obraId, defaultHeightM = 2.7 }: Props) {
  const { plans: planImports, isLoading: plansLoading } = usePlanImports(obraId);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Auto-selecionar: arquitetura mais recente, ou primeira
  const effectivePlanId = useMemo(() => {
    if (selectedPlanId) return selectedPlanId;
    const arq = planImports.find((p: any) => p.disciplina === 'arquitetura');
    return arq?.id ?? planImports[0]?.id ?? '';
  }, [selectedPlanId, planImports]);

  const { walls, isLoading: wallsLoading } = usePlanWalls(effectivePlanId || undefined);
  const { openings } = usePlanOpenings(effectivePlanId || undefined);
  const { rooms } = usePlanRooms(effectivePlanId || undefined);

  // Calcular escala m/px (mediana de comprimento_m / pixelLen)
  const scaleMperPx = useMemo(() => {
    const ratios: number[] = [];
    for (const w of walls) {
      const dx = w.end_point.x - w.start_point.x;
      const dy = w.end_point.y - w.start_point.y;
      const px = Math.hypot(dx, dy);
      if (px > 1 && w.comprimento_m > 0.1) ratios.push(w.comprimento_m / px);
    }
    if (ratios.length === 0) return 0.01;
    ratios.sort((a, b) => a - b);
    return ratios[Math.floor(ratios.length / 2)];
  }, [walls]);

  // Altura por defeito (média dos rooms se existir)
  const wallHeight = useMemo(() => {
    if (rooms.length > 0) {
      const avg = rooms.reduce((s, r) => s + (r.pe_direito_m || defaultHeightM), 0) / rooms.length;
      return avg || defaultHeightM;
    }
    return defaultHeightM;
  }, [rooms, defaultHeightM]);

  // Converter walls para metros e centrar
  const worldWalls = useMemo(() => {
    if (walls.length === 0) return [];
    const w0 = walls.map(w => ({
      id: w.id,
      x1: w.start_point.x * scaleMperPx,
      z1: w.start_point.y * scaleMperPx,
      x2: w.end_point.x * scaleMperPx,
      z2: w.end_point.y * scaleMperPx,
      thickness: (w.espessura_cm || 15) / 100,
      tipo: w.tipo_funcional,
      length_m: w.comprimento_m,
    }));
    // centrar em torno de (0,0)
    const allX = w0.flatMap(w => [w.x1, w.x2]);
    const allZ = w0.flatMap(w => [w.z1, w.z2]);
    const cx = (Math.min(...allX) + Math.max(...allX)) / 2;
    const cz = (Math.min(...allZ) + Math.max(...allZ)) / 2;
    return w0.map(w => ({ ...w, x1: w.x1 - cx, x2: w.x2 - cx, z1: w.z1 - cz, z2: w.z2 - cz }));
  }, [walls, scaleMperPx]);

  // Vãos por parede (usar posicao_na_parede em px → projetar no eixo da parede)
  const openingsByWall = useMemo(() => {
    const map = new Map<string, Array<{ start_m: number; width_m: number; height_m: number; sill_m: number }>>();
    for (const o of openings) {
      if (!o.posicao_na_parede) continue;
      const wall = walls.find(w => w.id === o.wall_id);
      if (!wall) continue;
      const dx = wall.end_point.x - wall.start_point.x;
      const dy = wall.end_point.y - wall.start_point.y;
      const px = Math.hypot(dx, dy);
      if (px < 1) continue;
      const t = ((o.posicao_na_parede.x - wall.start_point.x) * dx + (o.posicao_na_parede.y - wall.start_point.y) * dy) / (px * px);
      const center_m = Math.max(0, Math.min(1, t)) * wall.comprimento_m;
      const start_m = Math.max(0, center_m - o.largura_m / 2);
      const arr = map.get(wall.id) ?? [];
      arr.push({
        start_m,
        width_m: o.largura_m,
        height_m: o.altura_m,
        sill_m: o.peitoril_m ?? (o.tipo === 'porta' ? 0 : 0.9),
      });
      map.set(wall.id, arr);
    }
    return map;
  }, [openings, walls]);

  if (planImportsQuery.isLoading) {
    return (
      <Card className="rounded-xl"><CardContent className="py-10 text-center text-muted-foreground">
        <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" /> A carregar plantas…
      </CardContent></Card>
    );
  }

  if (planImports.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Edifício 3D (a partir da planta)
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          <Info className="h-4 w-4 mx-auto mb-2 opacity-60" />
          Sem plantas importadas para esta obra. Carregue uma planta em <strong>Plantas → Importar</strong> para ver o modelo 3D real.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" /> Edifício 3D (a partir da planta)
        </CardTitle>
        <Select value={effectivePlanId} onValueChange={setSelectedPlanId}>
          <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue placeholder="Escolher planta…" /></SelectTrigger>
          <SelectContent>
            {planImports.map((p: any) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                Rev {p.revision_number} · {p.disciplina ?? '—'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-2">
        {wallsLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" /> A carregar paredes…
          </div>
        ) : worldWalls.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Esta planta ainda não tem paredes marcadas. Abra a planta e desenhe/valide paredes para gerar o modelo 3D.
          </div>
        ) : (
          <PlanIsoScene
            walls={worldWalls}
            wallHeight={wallHeight}
            openingsByWall={openingsByWall}
          />
        )}
        <p className="text-xs text-muted-foreground italic mt-3">
          Extrusão isométrica esquemática a partir de <strong>{worldWalls.length}</strong> paredes da planta
          {rooms.length > 0 && `, altura média ${wallHeight.toFixed(2)} m`}.
        </p>
      </CardContent>
    </Card>
  );
}

// helper: dois imports juntos
function useImports(obraId: string) {
  const planImportsQuery = (usePlanImports(obraId) as any).planImportsQuery
    ?? { data: (usePlanImports(obraId) as any).planImports ?? [], isLoading: false };
  return { planImportsQuery };
}

// ───────── Cena ─────────
interface WorldWall { id: string; x1: number; z1: number; x2: number; z2: number; thickness: number; tipo: string; length_m: number; }

function PlanIsoScene({
  walls,
  wallHeight,
  openingsByWall,
}: {
  walls: WorldWall[];
  wallHeight: number;
  openingsByWall: Map<string, Array<{ start_m: number; width_m: number; height_m: number; sill_m: number }>>;
}) {
  const scale = 22; // px/m
  const stroke = 'hsl(var(--primary))';
  const fillWall = 'hsl(var(--primary) / 0.32)';
  const fillTop = 'hsl(var(--primary) / 0.18)';
  const fillSide = 'hsl(var(--primary) / 0.45)';
  const fillFloor = 'hsl(var(--muted) / 0.5)';
  const fillOpening = 'hsl(var(--background))';

  // Bounding box em coords isométricas
  const pts: Array<{ x: number; y: number }> = [];
  for (const w of walls) {
    for (const y of [0, wallHeight]) {
      pts.push(iso(w.x1, y, w.z1, scale));
      pts.push(iso(w.x2, y, w.z2, scale));
    }
  }
  const minX = Math.min(...pts.map(p => p.x));
  const maxX = Math.max(...pts.map(p => p.x));
  const minY = Math.min(...pts.map(p => p.y));
  const maxY = Math.max(...pts.map(p => p.y));
  const pad = 40;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;
  const offX = -minX + pad;
  const offY = -minY + pad;
  const P = (x: number, y: number, z: number) => {
    const p = iso(x, y, z, scale);
    return `${p.x + offX},${p.y + offY}`;
  };

  // Ordenar paredes back-to-front: somar x+z do centro (maior = mais à frente)
  const sorted = [...walls].sort((a, b) => {
    const ca = (a.x1 + a.x2) / 2 + (a.z1 + a.z2) / 2;
    const cb = (b.x1 + b.x2) / 2 + (b.z1 + b.z2) / 2;
    return ca - cb;
  });

  // chão (footprint bounding)
  const allX = walls.flatMap(w => [w.x1, w.x2]);
  const allZ = walls.flatMap(w => [w.z1, w.z2]);
  const x0 = Math.min(...allX) - 0.3, x1 = Math.max(...allX) + 0.3;
  const z0 = Math.min(...allZ) - 0.3, z1 = Math.max(...allZ) + 0.3;

  return (
    <div className="overflow-auto rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 p-4">
      <svg viewBox={`0 0 ${vbW} ${vbH}`} width="100%" style={{ maxHeight: 620, minWidth: Math.min(vbW, 900) }}>
        {/* chão */}
        <polygon
          points={`${P(x0, 0, z0)} ${P(x1, 0, z0)} ${P(x1, 0, z1)} ${P(x0, 0, z1)}`}
          fill={fillFloor}
          stroke="hsl(var(--border))"
          strokeWidth={0.6}
          strokeDasharray="3 4"
        />

        {sorted.map(w => {
          // Eixo da parede no plano XZ
          const dx = w.x2 - w.x1;
          const dz = w.z2 - w.z1;
          const len = Math.hypot(dx, dz) || 1;
          const ux = dx / len, uz = dz / len; // unitário ao longo

          const opens = (openingsByWall.get(w.id) ?? []).slice().sort((a, b) => a.start_m - b.start_m);

          // Construir segmentos sólidos = espaços entre vãos (mantendo sempre lintel acima)
          const segments: Array<{ s: number; e: number }> = [];
          let cursor = 0;
          for (const o of opens) {
            const oStart = Math.max(0, Math.min(len, o.start_m));
            const oEnd = Math.max(0, Math.min(len, o.start_m + o.width_m));
            if (oStart > cursor) segments.push({ s: cursor, e: oStart });
            cursor = Math.max(cursor, oEnd);
          }
          if (cursor < len) segments.push({ s: cursor, e: len });

          // Função: ponto na parede a posição p (m ao longo) e altura y
          const at = (p: number, y: number) => {
            const wx = w.x1 + ux * p;
            const wz = w.z1 + uz * p;
            return P(wx, y, wz);
          };

          return (
            <g key={w.id}>
              {/* Face frontal: full height onde não há vão; segmentos parciais (lintel + peitoril) onde há */}
              {/* Para simplicidade: desenhar full panel + recortes (cobrir vãos com cor de fundo) */}
              <polygon
                points={`${at(0, 0)} ${at(len, 0)} ${at(len, wallHeight)} ${at(0, wallHeight)}`}
                fill={fillWall}
                stroke={stroke}
                strokeWidth={0.9}
              />
              {/* Topo da parede */}
              <polygon
                points={`${at(0, wallHeight)} ${at(len, wallHeight)} ${(() => {
                  // deslocar topo pela espessura na perpendicular (nx, nz)
                  const nx = -uz, nz = ux;
                  const t = w.thickness;
                  return `${P(w.x2 + nx * t, wallHeight, w.z2 + nz * t)} ${P(w.x1 + nx * t, wallHeight, w.z1 + nz * t)}`;
                })()}`}
                fill={fillTop}
                stroke={stroke}
                strokeWidth={0.6}
              />
              {/* Vãos: desenhar como rectângulo do fundo (fill background) */}
              {opens.map((o, i) => {
                const sx = Math.max(0, Math.min(len, o.start_m));
                const ex = Math.max(0, Math.min(len, o.start_m + o.width_m));
                if (ex <= sx) return null;
                const y0 = Math.max(0, Math.min(wallHeight, o.sill_m));
                const y1 = Math.max(0, Math.min(wallHeight, o.sill_m + o.height_m));
                if (y1 <= y0) return null;
                return (
                  <polygon
                    key={`o-${w.id}-${i}`}
                    points={`${at(sx, y0)} ${at(ex, y0)} ${at(ex, y1)} ${at(sx, y1)}`}
                    fill={fillOpening}
                    stroke={stroke}
                    strokeWidth={0.6}
                    opacity={0.9}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Eixos compass */}
        <g transform={`translate(${vbW - 60}, ${vbH - 50})`} fontSize="9" fill="hsl(var(--muted-foreground))">
          <text x={0} y={0} fontWeight="700">N</text>
          <text x={0} y={36} fontWeight="700">S</text>
          <text x={-18} y={20} fontWeight="700">W</text>
          <text x={20} y={20} fontWeight="700">E</text>
        </g>
      </svg>
    </div>
  );
}
