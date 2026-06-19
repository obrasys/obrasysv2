import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KImage, Rect, Text, Group, Line, Circle } from "react-konva";
import useImage from "use-image";
import { PLANT_CATEGORY_COLORS } from "@/types/planta-leitura";
import type { PlantElement } from "@/types/planta-leitura";

interface Props {
  imageUrl: string | null;
  elements: PlantElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showGrid: boolean;
  showPins: boolean;
  showIgnored?: boolean;
}

// Categorias estruturais (parede/contorno fino)
const LINEAR_CATEGORIES = new Set([
  "Paredes",
  "Paredes ICF",
  "Vigas",
  "Vãos",
  "Portas",
  "Janelas",
  "Muros",
]);

export function PlantViewer({
  imageUrl,
  elements,
  selectedId,
  onSelect,
  showGrid,
  showPins,
  showIgnored = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [img] = useImage(imageUrl || "", "anonymous");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!img) return;
    const s = Math.min(size.w / img.width, size.h / img.height);
    setZoom(s);
    setOffset({ x: (size.w - img.width * s) / 2, y: (size.h - img.height * s) / 2 });
  }, [img, size.w, size.h]);

  const imgW = img?.width || 0;
  const imgH = img?.height || 0;

  // Filtra elementos: nunca renderiza com fundo opaco; ignorados ocultos por default
  const visible = elements.filter((el) => {
    if (el.status === "ignored" && !showIgnored) return false;
    const c = el.coordinates_json;
    if (!c) return false;
    const area = (c.w || 0) * (c.h || 0);
    // descarta bboxes gigantes não confiáveis (>40% da folha) — evita "blocos pretos"
    if (area > 0.4) return false;
    return true;
  });

  return (
    <div ref={containerRef} className="w-full h-full bg-muted/30 rounded-xl overflow-hidden relative">
      {!imageUrl && (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          Sem imagem para esta folha (DXF ainda não suportado para visualização).
        </div>
      )}
      <Stage
        width={size.w}
        height={size.h}
        draggable
        onDragEnd={(e) => setOffset({ x: e.target.x(), y: e.target.y() })}
        x={offset.x}
        y={offset.y}
        scaleX={zoom}
        scaleY={zoom}
        onWheel={(e) => {
          e.evt.preventDefault();
          const delta = e.evt.deltaY > 0 ? 0.9 : 1.1;
          setZoom((z) => Math.max(0.1, Math.min(8, z * delta)));
        }}
      >
        <Layer>
          {showGrid && imgW > 0 && (
            <>
              {Array.from({ length: Math.ceil(imgW / 50) }).map((_, i) => (
                <Line key={`v${i}`} points={[i * 50, 0, i * 50, imgH]} stroke="#0F4C5C" strokeWidth={0.5} opacity={0.06} />
              ))}
              {Array.from({ length: Math.ceil(imgH / 50) }).map((_, i) => (
                <Line key={`h${i}`} points={[0, i * 50, imgW, i * 50]} stroke="#0F4C5C" strokeWidth={0.5} opacity={0.06} />
              ))}
            </>
          )}
          {img && <KImage image={img} />}
          {showPins && visible.map((el) => {
            const c = el.coordinates_json!;
            if (imgW === 0) return null;
            const x = (c.x || 0) * imgW;
            const y = (c.y || 0) * imgH;
            const w = Math.max((c.w || 0.01) * imgW, 8);
            const h = Math.max((c.h || 0.01) * imgH, 8);
            const color = PLANT_CATEGORY_COLORS[el.category || ""] || "#0F4C5C";
            const selected = el.id === selectedId;
            const isReview = el.status === "review" || el.status === "proposed";
            const isIgnored = el.status === "ignored";
            const isLinear = LINEAR_CATEGORIES.has(el.category || "");

            // Estilo: contorno fino, sem preenchimento opaco
            const dash = isIgnored ? [2, 4] : isReview ? [4, 3] : undefined;
            const strokeW = (selected ? 2 : 1) / zoom;

            return (
              <Group key={el.id} onClick={() => onSelect(el.id)} onTap={() => onSelect(el.id)}>
                <Rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  stroke={color}
                  strokeWidth={strokeW}
                  dash={dash}
                  fill={selected ? `${color}1A` : "transparent"}
                  cornerRadius={1}
                  listening
                />
                {/* Pin discreto canto superior esquerdo */}
                {!isLinear && el.code && (
                  <Group x={x + 2 / zoom} y={y + 2 / zoom}>
                    <Circle radius={5 / zoom} fill={color} opacity={0.9} />
                    <Text
                      text={el.code.slice(0, 3)}
                      fontSize={6 / zoom}
                      fill="#fff"
                      x={-5 / zoom}
                      y={-3 / zoom}
                      width={10 / zoom}
                      align="center"
                    />
                  </Group>
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
