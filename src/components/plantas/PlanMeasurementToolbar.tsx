import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MousePointer2, Minus, Hash, Undo2 } from "lucide-react";

type MeasureMode = "view" | "calibrate" | "measure_line" | "measure_count";

interface PlanMeasurementToolbarProps {
  mode: MeasureMode;
  onModeChange: (mode: MeasureMode) => void;
  canMeasure: boolean;
  onUndo: () => void;
  hasActivePoints: boolean;
}

export function PlanMeasurementToolbar({
  mode,
  onModeChange,
  canMeasure,
  onUndo,
  hasActivePoints,
}: PlanMeasurementToolbarProps) {
  const tools: Array<{ id: MeasureMode; icon: typeof MousePointer2; label: string; tip: string }> = [
    { id: "view", icon: MousePointer2, label: "Navegar", tip: "Arrastar e zoom" },
    { id: "measure_line", icon: Minus, label: "Linha", tip: "Medir comprimentos (clique pontos, duplo-clique termina)" },
    { id: "measure_count", icon: Hash, label: "Contagem", tip: "Contar elementos (clique para marcar)" },
  ];

  return (
    <div className="flex items-center gap-1 bg-background border rounded-lg p-1 shadow-sm">
      {tools.map((tool) => (
        <Tooltip key={tool.id}>
          <TooltipTrigger asChild>
            <Button
              variant={mode === tool.id ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => onModeChange(tool.id)}
              disabled={tool.id !== "view" && !canMeasure}
            >
              <tool.icon className="w-3.5 h-3.5 mr-1.5" />
              {tool.label}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {!canMeasure && tool.id !== "view" ? "Calibre a escala primeiro" : tool.tip}
          </TooltipContent>
        </Tooltip>
      ))}

      {hasActivePoints && (
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-1" onClick={onUndo}>
          <Undo2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
