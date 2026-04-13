import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { getSymbolById } from "@/types/plan-symbols";
import { PlanSymbolPreview } from "./PlanSymbolPreview";
import type { PlacedPlantElement } from "@/types/plan-symbols";

interface PlanElementPropertiesProps {
  element: PlacedPlantElement | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<PlacedPlantElement>) => void;
  onDelete: (id: string) => void;
}

export function PlanElementProperties({ element, open, onClose, onUpdate, onDelete }: PlanElementPropertiesProps) {
  const [note, setNote] = useState("");
  const [environment, setEnvironment] = useState("");

  useEffect(() => {
    if (element) {
      setNote(element.note ?? "");
      setEnvironment(element.environment ?? "");
    }
  }, [element]);

  if (!element) return null;
  const symbol = getSymbolById(element.symbolTypeId);

  const handleSave = () => {
    onUpdate(element.id, { note: note || undefined, environment: environment || undefined, updatedAt: new Date().toISOString() });
    onClose();
  };

  const handleDelete = () => {
    onDelete(element.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            {symbol && <PlanSymbolPreview shape={symbol.shape} size={22} />}
            {symbol?.name ?? "Elemento"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>Categoria: <strong className="text-foreground">{element.category}</strong></span>
            {element.subcategory && <span>Sub: <strong className="text-foreground">{element.subcategory}</strong></span>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ambiente / Compartimento</Label>
            <Input value={environment} onChange={(e) => setEnvironment(e.target.value)} placeholder="Ex: Sala, Cozinha..." className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Observação</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota opcional..." className="h-8 text-xs" />
          </div>
          <div className="text-[10px] text-muted-foreground">
            Posição: ({Math.round(element.x)}, {Math.round(element.y)})
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="destructive" size="sm" onClick={handleDelete} className="text-xs h-8">
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Apagar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>Cancelar</Button>
            <Button size="sm" className="text-xs h-8" onClick={handleSave}>Guardar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
