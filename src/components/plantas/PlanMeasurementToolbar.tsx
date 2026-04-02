import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MousePointer2, Minus, Hash, Pentagon, Undo2, SquareDashed, Wallpaper, DoorOpen } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export type MeasureMode =
  | "view"
  | "calibrate"
  | "measure_line"
  | "measure_area"
  | "measure_count"
  | "draw_room"
  | "draw_wall"
  | "draw_opening";

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
  const measureTools: Array<{ id: MeasureMode; icon: typeof MousePointer2; label: string; tip: string }> = [
    { id: "view", icon: MousePointer2, label: "Navegar", tip: "Arrastar e zoom" },
    { id: "measure_line", icon: Minus, label: "Linha", tip: "Medir comprimentos" },
    { id: "measure_area", icon: Pentagon, label: "Área", tip: "Medir áreas" },
    { id: "measure_count", icon: Hash, label: "Contagem", tip: "Contar elementos" },
  ];

  const drawTools: Array<{ id: MeasureMode; icon: typeof MousePointer2; label: string; tip: string }> = [
    { id: "draw_room", icon: SquareDashed, label: "Comp.", tip: "Marcar compartimento (polígono)" },
    { id: "draw_wall", icon: Wallpaper, label: "Parede", tip: "Marcar parede (linha)" },
    { id: "draw_opening", icon: DoorOpen, label: "Vão", tip: "Marcar porta/janela sobre parede" },
  ];

  return (
    <div className="flex items-center gap-1 bg-background border rounded-lg p-1 shadow-sm">
      {measureTools.map((tool) => (
        <Tooltip key={tool.id}>
          <TooltipTrigger asChild>
            <Button
              variant={mode === tool.id ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={() => onModeChange(tool.id)}
              disabled={tool.id !== "view" && !canMeasure}
            >
              <tool.icon className="w-3.5 h-3.5 mr-1" />
              {tool.label}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {!canMeasure && tool.id !== "view" ? "Calibre a escala primeiro" : tool.tip}
          </TooltipContent>
        </Tooltip>
      ))}

      <Separator orientation="vertical" className="h-6 mx-0.5" />

      {drawTools.map((tool) => (
        <Tooltip key={tool.id}>
          <TooltipTrigger asChild>
            <Button
              variant={mode === tool.id ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={() => onModeChange(tool.id)}
              disabled={!canMeasure}
            >
              <tool.icon className="w-3.5 h-3.5 mr-1" />
              {tool.label}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {!canMeasure ? "Calibre a escala primeiro" : tool.tip}
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
