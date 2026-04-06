import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallpaper, Trash2, DoorOpen, Plus } from "lucide-react";
import type { PlanWall, PlanOpening, PlanRoom } from "@/types/plan-measurements";
import { TIPO_FUNCIONAL_OPTIONS, MATERIAL_PAREDE_OPTIONS, TIPO_VAO_OPTIONS } from "@/types/plan-measurements";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface PlanWallsListProps {
  walls: PlanWall[];
  openings: PlanOpening[];
  rooms: PlanRoom[];
  onDeleteWall: (id: string) => void;
  onUpdateWall: (id: string, updates: Partial<Pick<PlanWall, "espessura_cm" | "tipo_funcional" | "material" | "room_id">>) => void;
  onAddOpening: (data: { wall_id: string; tipo: string; largura_m: number; altura_m: number; peitoril_m?: number }) => void;
  onDeleteOpening: (id: string) => void;
}

export function PlanWallsList({
  walls,
  openings,
  rooms,
  onDeleteWall,
  onUpdateWall,
  onAddOpening,
  onDeleteOpening,
}: PlanWallsListProps) {
  const [openingDialog, setOpeningDialog] = useState<string | null>(null);
  const [openingType, setOpeningType] = useState("porta");
  const [openingWidth, setOpeningWidth] = useState("0.80");
  const [openingHeight, setOpeningHeight] = useState("2.10");
  const [openingPeitoril, setOpeningPeitoril] = useState("");

  const handleAddOpening = () => {
    if (!openingDialog) return;
    onAddOpening({
      wall_id: openingDialog,
      tipo: openingType,
      largura_m: parseFloat(openingWidth) || 0.8,
      altura_m: parseFloat(openingHeight) || 2.1,
      peitoril_m: openingPeitoril ? parseFloat(openingPeitoril) : undefined,
    });
    setOpeningDialog(null);
    setOpeningType("porta");
    setOpeningWidth("0.80");
    setOpeningHeight("2.10");
    setOpeningPeitoril("");
  };

  const totalLength = walls.reduce((s, w) => s + w.comprimento_m, 0);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Wallpaper className="w-4 h-4" />
              Paredes ({walls.length})
            </span>
            {walls.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                Total: {totalLength.toFixed(2)} m
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {walls.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">
                Nenhuma parede. Use a ferramenta "Parede" para marcar.
              </p>
            </div>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto overscroll-contain pr-1 xl:max-h-[400px]">
              <div className="divide-y">
                {walls.map((w, idx) => {
                  const wallOpenings = openings.filter((o) => o.wall_id === w.id);
                  const room = rooms.find((r) => r.id === w.room_id);
                  return (
                    <div key={w.id} className="px-4 py-2.5 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium">Parede {idx + 1}</span>
                            <Badge variant="outline" className="text-[9px] h-4 px-1">
                              {TIPO_FUNCIONAL_OPTIONS.find((t) => t.value === w.tipo_funcional)?.label || w.tipo_funcional}
                            </Badge>
                            <Badge variant="secondary" className="text-[9px] h-4 px-1">
                              {w.espessura_cm} cm
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span>{w.comprimento_m.toFixed(2)} m</span>
                            <span>•</span>
                            <span>{MATERIAL_PAREDE_OPTIONS.find((m) => m.value === w.material)?.label || w.material}</span>
                            {room && (
                              <>
                                <span>•</span>
                                <span>{room.nome}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setOpeningDialog(w.id)}
                            title="Adicionar vão"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => onDeleteWall(w.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {wallOpenings.length > 0 && (
                        <div className="mt-1.5 ml-3 space-y-1">
                          {wallOpenings.map((o) => (
                            <div key={o.id} className="flex items-center justify-between text-[10px] bg-muted/50 rounded px-2 py-1">
                              <div className="flex items-center gap-1.5">
                                <DoorOpen className="w-3 h-3 text-muted-foreground" />
                                <span>{TIPO_VAO_OPTIONS.find((t) => t.value === o.tipo)?.label || o.tipo}</span>
                                <span className="text-muted-foreground">
                                  {o.largura_m}×{o.altura_m} m
                                </span>
                                {o.peitoril_m != null && (
                                  <span className="text-muted-foreground">peit. {o.peitoril_m} m</span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                onClick={() => onDeleteOpening(o.id)}
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!openingDialog} onOpenChange={(open) => !open && setOpeningDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Adicionar Vão</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={openingType} onValueChange={setOpeningType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_VAO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Largura (m)</Label>
                <Input value={openingWidth} onChange={(e) => setOpeningWidth(e.target.value)} className="h-8 text-xs" type="number" step="0.01" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Altura (m)</Label>
                <Input value={openingHeight} onChange={(e) => setOpeningHeight(e.target.value)} className="h-8 text-xs" type="number" step="0.01" />
              </div>
            </div>
            {(openingType === "janela" || openingType === "claraboia") && (
              <div className="space-y-1">
                <Label className="text-xs">Peitoril (m)</Label>
                <Input value={openingPeitoril} onChange={(e) => setOpeningPeitoril(e.target.value)} className="h-8 text-xs" type="number" step="0.01" placeholder="1.10" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpeningDialog(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleAddOpening}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
