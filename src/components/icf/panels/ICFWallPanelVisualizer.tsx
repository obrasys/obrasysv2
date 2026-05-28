import type { ICFWallPanel, ICFBlockLibraryItem, ICFWallCompositionResult } from '@/types/icf-homeblock';

interface Props {
  panel: Pick<ICFWallPanel, 'length_m' | 'height_m' | 'openings' | 'selected_block_code'>;
  block?: ICFBlockLibraryItem | null;
  composition?: ICFWallCompositionResult | null;
}

/**
 * Visualização proporcional do pano de parede: fiadas, divisões verticais,
 * aberturas e sobras destacadas. Render SVG simples - não é editor.
 */
export const ICFWallPanelVisualizer = ({ panel, block, composition }: Props) => {
  const L = panel.length_m;
  const H = panel.height_m;
  if (!L || !H) {
    return <div className="text-xs text-muted-foreground">Dimensões inválidas</div>;
  }

  // SVG coords: usa 1m = 100 unidades, mas escala para caber em 800x300
  const baseW = 800;
  const baseH = 300;
  const scale = Math.min(baseW / L, baseH / H);
  const w = L * scale;
  const h = H * scale;

  const blockLenM = (block?.length_mm ?? 900) / 1000;
  const blockHM = (block?.height_mm ?? 270) / 1000;

  const rows = composition?.rows ?? Math.floor(H / blockHM);
  const blocksPerRow = composition?.blocks_per_row ?? Math.floor(L / blockLenM);
  const remLenMm = composition?.remaining_length_mm ?? 0;
  const remHMm = composition?.remaining_height_mm ?? 0;

  return (
    <div className="w-full overflow-x-auto bg-muted/20 rounded-lg p-3">
      <svg viewBox={`0 0 ${w + 4} ${h + 4}`} width="100%" style={{ maxHeight: 320 }}>
        {/* parede */}
        <rect x={2} y={2} width={w} height={h} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth={1.5} />

        {/* fiadas */}
        {Array.from({ length: rows }).map((_, i) => {
          const y = 2 + (i + 1) * blockHM * scale;
          if (y > 2 + h) return null;
          return <line key={`row-${i}`} x1={2} y1={y} x2={2 + w} y2={y} stroke="hsl(var(--border))" strokeWidth={0.5} />;
        })}
        {/* divisões verticais */}
        {Array.from({ length: blocksPerRow }).map((_, i) => {
          const x = 2 + (i + 1) * blockLenM * scale;
          if (x > 2 + w) return null;
          return <line key={`col-${i}`} x1={x} y1={2} x2={x} y2={2 + h} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="2 2" />;
        })}

        {/* sobra horizontal */}
        {remLenMm > 0 && (
          <rect
            x={2 + blocksPerRow * blockLenM * scale}
            y={2}
            width={Math.max(2, (remLenMm / 1000) * scale)}
            height={h}
            fill="hsl(var(--destructive) / 0.15)"
            stroke="hsl(var(--destructive))"
            strokeWidth={0.5}
            strokeDasharray="3 2"
          />
        )}
        {/* sobra vertical (topo) */}
        {remHMm > 0 && (
          <rect
            x={2}
            y={2 + rows * blockHM * scale}
            width={w}
            height={Math.max(2, (remHMm / 1000) * scale)}
            fill="hsl(var(--accent) / 0.25)"
            stroke="hsl(var(--accent-foreground))"
            strokeWidth={0.5}
            strokeDasharray="3 2"
          />
        )}

        {/* aberturas */}
        {(panel.openings ?? []).map((o, idx) => {
          const ox = 2 + (Number(o.position_m) || 0.2) * scale;
          const oy = 2 + h - ((Number(o.sill_height_m) || 0) + Number(o.height_m)) * scale;
          const ow = Number(o.width_m) * scale;
          const oh = Number(o.height_m) * scale;
          return (
            <g key={idx}>
              <rect x={ox} y={oy} width={ow} height={oh} fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={1} />
              <text x={ox + 4} y={oy + 12} fontSize="10" fill="hsl(var(--muted-foreground))">
                {o.type === 'porta' ? 'P' : o.type === 'janela' ? 'J' : '◌'} {Number(o.width_m).toFixed(2)}×{Number(o.height_m).toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
        <span>📐 {L.toFixed(2)} × {H.toFixed(2)} m</span>
        <span>🧱 {rows} fiadas × {blocksPerRow} blocos</span>
        {remLenMm > 0 && <span className="text-destructive">Sobra horizontal: {remLenMm} mm</span>}
        {remHMm > 0 && <span className="text-amber-700">Remate superior: {remHMm} mm</span>}
      </div>
    </div>
  );
};
