import { useQuery } from "@tanstack/react-query";
import DxfParser from "dxf-parser";

interface DxfRenderResult {
  dataUrl: string;
  width: number;
  height: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  pixelsPerUnit: number;
}

const CANVAS_MAX = 2400;
const PADDING = 40;

async function renderDxf(url: string): Promise<DxfRenderResult> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao descarregar DXF (${res.status})`);
  const text = await res.text();

  const parser = new DxfParser();
  const dxf = parser.parseSync(text);
  if (!dxf || !dxf.entities) throw new Error("DXF inválido ou sem entidades");

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const considerPoint = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  // Only consider entities that we actually rasterize, so that
  // off-canvas DIMENSION/INSERT/MTEXT anchors don't inflate the bbox
  // and shrink the real geometry to a single pixel.
  const DRAWABLE = new Set(["LINE", "LWPOLYLINE", "POLYLINE", "CIRCLE", "ARC", "ELLIPSE"]);
  for (const e of dxf.entities as any[]) {
    const t = String(e.type || "").toUpperCase();
    if (!DRAWABLE.has(t)) continue;
    if (e.vertices?.length) {
      for (const v of e.vertices) considerPoint(v.x, v.y);
    } else if (e.center) {
      const r = e.radius ?? 0;
      considerPoint(e.center.x - r, e.center.y - r);
      considerPoint(e.center.x + r, e.center.y + r);
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || maxX <= minX || maxY <= minY) {
    throw new Error("DXF sem geometria desenhável");
  }

  const dxfW = maxX - minX;
  const dxfH = maxY - minY;
  const scale = Math.min((CANVAS_MAX - PADDING * 2) / dxfW, (CANVAS_MAX - PADDING * 2) / dxfH);
  const canvasW = Math.round(dxfW * scale + PADDING * 2);
  const canvasH = Math.round(dxfH * scale + PADDING * 2);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const tx = (x: number) => PADDING + (x - minX) * scale;
  const ty = (y: number) => canvasH - PADDING - (y - minY) * scale; // flip Y

  for (const e of dxf.entities as any[]) {
    const type = String(e.type || "").toUpperCase();
    ctx.beginPath();
    if (type === "LINE" && e.vertices?.length >= 2) {
      ctx.moveTo(tx(e.vertices[0].x), ty(e.vertices[0].y));
      ctx.lineTo(tx(e.vertices[1].x), ty(e.vertices[1].y));
      ctx.stroke();
    } else if ((type === "LWPOLYLINE" || type === "POLYLINE") && e.vertices?.length) {
      ctx.moveTo(tx(e.vertices[0].x), ty(e.vertices[0].y));
      for (let i = 1; i < e.vertices.length; i++) {
        ctx.lineTo(tx(e.vertices[i].x), ty(e.vertices[i].y));
      }
      if (e.shape) ctx.closePath();
      ctx.stroke();
    } else if (type === "CIRCLE" && e.center) {
      ctx.arc(tx(e.center.x), ty(e.center.y), e.radius * scale, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === "ARC" && e.center) {
      const start = -(e.endAngle ?? 0) * (Math.PI / 180);
      const end = -(e.startAngle ?? 0) * (Math.PI / 180);
      ctx.arc(tx(e.center.x), ty(e.center.y), e.radius * scale, start, end);
      ctx.stroke();
    } else if (type === "ELLIPSE" && e.center) {
      const rx = Math.hypot(e.majorAxisEndPoint?.x ?? 0, e.majorAxisEndPoint?.y ?? 0) * scale;
      const ry = rx * (e.axisRatio ?? 1);
      ctx.ellipse(tx(e.center.x), ty(e.center.y), rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvasW,
    height: canvasH,
    bounds: { minX, minY, maxX, maxY },
    pixelsPerUnit: scale,
  };
}

export function useDxfRenderer(url: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["dxf-render", url],
    queryFn: () => renderDxf(url!),
    enabled: !!url && enabled,
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
}
