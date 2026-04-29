import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Layers, Trash2, Building2 } from "lucide-react";
import { usePlanFloors, type PlanFloorType } from "@/hooks/usePlanFloors";
import { cn } from "@/lib/utils";

const FLOOR_TYPES: Array<{ value: PlanFloorType; label: string }> = [
  { value: "subsolo", label: "Subsolo / Cave" },
  { value: "terreo", label: "Térreo / R/C" },
  { value: "intermedio", label: "Andar intermédio" },
  { value: "cobertura", label: "Cobertura" },
  { value: "tecnico", label: "Piso técnico" },
  { value: "exterior", label: "Exterior / Logradouro" },
  { value: "outro", label: "Outro" },
];

interface PlanFloorSelectorProps {
  obraId?: string;
  selectedFloorId?: string | null;
  onSelectFloor: (floorId: string | null) => void;
  compact?: boolean;
}

export function PlanFloorSelector({
  obraId,
  selectedFloorId,
  onSelectFloor,
  compact = false,
}: PlanFloorSelectorProps) {
  const { floors, isLoading, addFloor, deleteFloor } = usePlanFloors(obraId);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<PlanFloorType>("terreo");
  const [height, setHeight] = useState("2.70");

  const handleCreate = async () => {
    if (!name.trim()) return;
    const created = await addFloor.mutateAsync({
      name: name.trim(),
      type,
      default_ceiling_height: parseFloat(height) || 2.7,
    });
    onSelectFloor(created.id);
    setName("");
    setType("terreo");
    setHeight("2.70");
    setShowCreate(false);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <Select
          value={selectedFloorId ?? "__none__"}
          onValueChange={(v) => onSelectFloor(v === "__none__" ? null : v)}
        >
          <SelectTrigger className="h-9 min-w-[180px]">
            <SelectValue placeholder="Pavimento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Sem pavimento —</SelectItem>
            {floors.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              onClick={() => setShowCreate(true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Novo pavimento</TooltipContent>
        </Tooltip>

        <CreateFloorDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          name={name}
          setName={setName}
          type={type}
          setType={setType}
          height={height}
          setHeight={setHeight}
          onSubmit={handleCreate}
          isSaving={addFloor.isPending}
        />
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-3 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Pavimentos</h3>
          <Badge variant="secondary" className="text-[10px]">
            {floors.length}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCreate(true)}
          type="button"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Novo
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">A carregar…</p>
      ) : floors.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum pavimento criado. Adicione subsolo, térreo, andares ou cobertura
          para organizar as medições.
        </p>
      ) : (
        <div className="space-y-1.5">
          {floors.map((f) => {
            const active = f.id === selectedFloorId;
            return (
              <div
                key={f.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50",
                )}
                onClick={() => onSelectFloor(f.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {FLOOR_TYPES.find((t) => t.value === f.type)?.label ?? f.type}{" "}
                    · pé-direito {f.default_ceiling_height} m
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Eliminar "${f.name}"?`)) {
                      deleteFloor.mutate(f.id);
                      if (active) onSelectFloor(null);
                    }
                  }}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <CreateFloorDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        name={name}
        setName={setName}
        type={type}
        setType={setType}
        height={height}
        setHeight={setHeight}
        onSubmit={handleCreate}
        isSaving={addFloor.isPending}
      />
    </Card>
  );
}

interface CreateFloorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  setName: (v: string) => void;
  type: PlanFloorType;
  setType: (v: PlanFloorType) => void;
  height: string;
  setHeight: (v: string) => void;
  onSubmit: () => void;
  isSaving: boolean;
}

function CreateFloorDialog({
  open,
  onOpenChange,
  name,
  setName,
  type,
  setType,
  height,
  setHeight,
  onSubmit,
  isSaving,
}: CreateFloorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo pavimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="floor-name">Nome</Label>
            <Input
              id="floor-name"
              placeholder="Ex.: R/C, 1.º andar, Cobertura"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as PlanFloorType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLOOR_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="floor-height">Pé-direito (m)</Label>
              <Input
                id="floor-height"
                type="number"
                step="0.05"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={!name.trim() || isSaving} type="button">
            {isSaving ? "A criar…" : "Criar pavimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
