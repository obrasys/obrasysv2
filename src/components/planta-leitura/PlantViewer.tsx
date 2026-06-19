import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KImage, Rect, Text, Group, Line } from "react-konva";
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
}

export function PlantViewer({ imageUrl, elements, selectedId, onSelect, showGrid, showPins }: Props) {
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

  // Fit image
  useEffect(() => {
    if (!img) return;
    const s = Math.min(size.w / img.width, size.h / img.height);
    setZoom(s);
    setOffset({ x: (size.w - img.width * s) / 2, y: (size.h - img.height * s) / 2 });
  }, [img, size.w, size.h]);

  const imgW = img?.width || 0;
  const imgH = img?.height || 0;

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
          {showPins && elements.map((el) => {
            const c = el.coordinates_json;
            if (!c || imgW === 0) return null;
            const x = (c.x || 0) * imgW;
            const y = (c.y || 0) * imgH;
            const w = Math.max((c.w || 0.02) * imgW, 16);
            const h = Math.max((c.h || 0.02) * imgH, 16);
            const color = PLANT_CATEGORY_COLORS[el.category || ""] || "#444";
            const selected = el.id === selectedId;
            const ignored = el.status === "ignored";
            return (
              <Group key={el.id} x={x} y={y} onClick={() => onSelect(el.id)} onTap={() => onSelect(el.id)}>
                <Rect
                  width={w}
                  height={h}
                  stroke={color}
                  strokeWidth={selected ? 3 : 1.5}
                  dash={ignored ? [4, 4] : undefined}
                  fill={selected ? `${color}33` : `${color}1A`}
                  cornerRadius={2}
                />
                <Rect width={Math.max(w, 40)} height={16} fill={color} cornerRadius={2} />
                <Text
                  text={el.code || "—"}
                  fontSize={11}
                  fill="#fff"
                  padding={2}
                  width={Math.max(w, 40)}
                  align="center"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
