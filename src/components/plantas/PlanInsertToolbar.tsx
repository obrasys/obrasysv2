import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Check, Undo2, RefreshCw } from "lucide-react";
import { getSymbolById } from "@/types/plan-symbols";
import { PlanSymbolPreview } from "./PlanSymbolPreview";

interface PlanInsertToolbarProps {
  symbolTypeId: string;
  insertedCount: number;
  onFinish: () => void;
  onUndo: () => void;
  onChangeType: () => void;
  onCancel: () => void;
}

/** Floating context toolbar shown during continuous insertion */
export function PlanInsertToolbar({
  symbolTypeId,
  insertedCount,
  onFinish,
  onUndo,
  onChangeType,
  onCancel,
}: PlanInsertToolbarProps) {
  const symbol = getSymbolById(symbolTypeId);
  if (!symbol) return null;

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-background/95 backdrop-blur border rounded-lg px-3 py-2 shadow-lg animate-in slide-in-from-bottom-2 duration-200">
      <PlanSymbolPreview shape={symbol.shape} size={22} />
      <div className="flex flex-col mr-1">
        <span className="text-xs font-medium leading-tight">{symbol.name}</span>
        <span className="text-[10px] text-muted-foreground leading-tight">Inserção contínua</span>
      </div>

      <Badge variant="secondary" className="text-xs tabular-nums px-1.5">
        {insertedCount}
      </Badge>

      <div className="w-px h-6 bg-border" />

      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onUndo} disabled={insertedCount === 0} title="Desfazer último">
        <Undo2 className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onChangeType} title="Mudar tipo">
        <RefreshCw className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel} title="Cancelar">
        <X className="w-3.5 h-3.5" />
      </Button>

      <Button size="sm" className="h-7 text-xs px-3" onClick={onFinish}>
        <Check className="w-3.5 h-3.5 mr-1" /> Concluir
      </Button>
    </div>
  );
}
