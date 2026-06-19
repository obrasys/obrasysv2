import { Maximize2, Move, MousePointer2, Ruler, Grid3x3, MapPin, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  fileName: string;
  sheetIndex: number;
  totalSheets: number;
  scale: string | null;
  syncing: boolean;
  showGrid: boolean;
  showPins: boolean;
  onToggleGrid: () => void;
  onTogglePins: () => void;
}

export function PlantViewerToolbar({ fileName, sheetIndex, totalSheets, scale, syncing, showGrid, showPins, onToggleGrid, onTogglePins }: Props) {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b bg-card rounded-t-xl text-xs">
        <div className="font-semibold text-primary">Planta / Leitura Assistida</div>
        <div className="text-muted-foreground truncate max-w-xs">{fileName}</div>
        <div className="px-2 py-0.5 rounded bg-muted">PÁG {sheetIndex}/{totalSheets}</div>
        {scale && <div className="px-2 py-0.5 rounded bg-muted">ESC {scale}</div>}
        <div className={`px-2 py-0.5 rounded ${syncing ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
          {syncing ? "A sincronizar..." : "Sincronizado"}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {[
            { i: ZoomOut, t: "Zoom -" },
            { i: ZoomIn, t: "Zoom +" },
            { i: Maximize2, t: "Ajustar ao ecrã" },
            { i: Move, t: "Mover" },
            { i: MousePointer2, t: "Selecionar" },
            { i: Ruler, t: "Medir manualmente (em breve)" },
          ].map(({ i: Icon, t }) => (
            <Tooltip key={t}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Icon className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>{t}</TooltipContent>
            </Tooltip>
          ))}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={showGrid ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={onToggleGrid}><Grid3x3 className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>Alternar grelha</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={showPins ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={onTogglePins}><MapPin className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>Mostrar/ocultar marcações</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
