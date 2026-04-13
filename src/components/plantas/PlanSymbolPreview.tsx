import type { SymbolShape } from "@/types/plan-symbols";

interface PlanSymbolPreviewProps {
  shape: SymbolShape;
  size?: number;
}

/** Small inline SVG preview of a symbol shape */
export function PlanSymbolPreview({ shape, size = 20 }: PlanSymbolPreviewProps) {
  const cx = size / 2;
  const cy = size / 2;

  const renderShape = () => {
    switch (shape.type) {
      case "circle":
        return <circle cx={cx} cy={cy} r={Math.min(shape.radius, size / 2 - 2)} fill={shape.fill} stroke={shape.stroke} strokeWidth={1.5} />;
      case "rect":
        return (
          <rect
            x={cx - Math.min(shape.width, size - 4) / 2}
            y={cy - Math.min(shape.height, size - 4) / 2}
            width={Math.min(shape.width, size - 4)}
            height={Math.min(shape.height, size - 4)}
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={1.5}
            rx={1}
          />
        );
      case "cross": {
        const s = Math.min(shape.size, size / 2 - 2);
        return (
          <g stroke={shape.stroke} strokeWidth={2} strokeLinecap="round">
            <line x1={cx - s} y1={cy} x2={cx + s} y2={cy} />
            <line x1={cx} y1={cy - s} x2={cx} y2={cy + s} />
          </g>
        );
      }
      case "triangle": {
        const s = Math.min(shape.size, size / 2 - 2);
        const points = `${cx},${cy - s} ${cx - s},${cy + s * 0.7} ${cx + s},${cy + s * 0.7}`;
        return <polygon points={points} fill={shape.fill} stroke={shape.stroke} strokeWidth={1.5} />;
      }
      case "diamond": {
        const s = Math.min(shape.size, size / 2 - 2);
        const points = `${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`;
        return <polygon points={points} fill={shape.fill} stroke={shape.stroke} strokeWidth={1.5} />;
      }
      case "star": {
        const s = Math.min(shape.size, size / 2 - 2);
        const inner = s * 0.4;
        const pts: string[] = [];
        for (let i = 0; i < 5; i++) {
          const outerAngle = (Math.PI / 2) + (2 * Math.PI * i) / 5;
          const innerAngle = outerAngle + Math.PI / 5;
          pts.push(`${cx + s * Math.cos(outerAngle)},${cy - s * Math.sin(outerAngle)}`);
          pts.push(`${cx + inner * Math.cos(innerAngle)},${cy - inner * Math.sin(innerAngle)}`);
        }
        return <polygon points={pts.join(" ")} fill={shape.fill} stroke={shape.stroke} strokeWidth={1} />;
      }
    }
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      {renderShape()}
    </svg>
  );
}
