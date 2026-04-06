import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SquareDashed, Trash2, Edit2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PlanRoom } from "@/types/plan-measurements";
import { TIPO_COMPARTIMENTO_OPTIONS } from "@/types/plan-measurements";
import { useState } from "react";

interface PlanRoomsListProps {
  rooms: PlanRoom[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<PlanRoom, "nome" | "tipo_compartimento" | "pe_direito_m">>) => void;
  selectedRoomId?: string;
  onSelectRoom?: (id: string | undefined) => void;
}

const ESTADO_COLORS: Record<string, "secondary" | "default" | "destructive"> = {
  pendente: "secondary",
  validado: "default",
  rejeitado: "destructive",
};

const ROOM_COLORS = [
  "#8b5cf6", "#06b6d4", "#f59e0b", "#22c55e", "#ec4899", "#ef4444", "#3b82f6",
];

export function PlanRoomsList({ rooms, onDelete, onUpdate, selectedRoomId, onSelectRoom }: PlanRoomsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");

  const startEdit = (r: PlanRoom) => {
    setEditingId(r.id);
    setEditName(r.nome);
    setEditType(r.tipo_compartimento);
  };

  const saveEdit = (id: string) => {
    onUpdate(id, { nome: editName, tipo_compartimento: editType as any });
    setEditingId(null);
  };

  const totalArea = rooms.reduce((s, r) => s + r.area_m2, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <SquareDashed className="w-4 h-4" />
            Compartimentos ({rooms.length})
          </span>
          {rooms.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              Total: {totalArea.toFixed(2)} m²
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rooms.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-muted-foreground">
              Nenhum compartimento. Use a ferramenta "Comp." para marcar.
            </p>
          </div>
        ) : (
          <div className="max-h-[55vh] overflow-y-auto overscroll-contain pr-1 xl:max-h-[300px]">
            <div className="divide-y">
              {rooms.map((r, idx) => {
                const color = ROOM_COLORS[idx % ROOM_COLORS.length];
                const isSelected = selectedRoomId === r.id;
                return (
                  <div
                    key={r.id}
                    className={`px-4 py-2.5 cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                    onClick={() => onSelectRoom?.(isSelected ? undefined : r.id)}
                  >
                    {editingId === r.id ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7 text-xs"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && saveEdit(r.id)}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => saveEdit(r.id)}>
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <Select value={editType} onValueChange={setEditType}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPO_COMPARTIMENTO_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: color }} />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-medium truncate block">{r.nome}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {TIPO_COMPARTIMENTO_OPTIONS.find((t) => t.value === r.tipo_compartimento)?.label || r.tipo_compartimento}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-mono font-medium block">{r.area_m2.toFixed(2)} m²</span>
                            <span className="text-[10px] text-muted-foreground">{r.perimetro_m.toFixed(2)} m</span>
                          </div>
                          {r.origem === "ia_inferida" && (
                            <Badge variant="outline" className="text-[8px] h-4 px-1 border-cyan-500 text-cyan-600">IA</Badge>
                          )}
                          <Badge variant={ESTADO_COLORS[r.estado_validacao]} className="text-[9px] h-4 px-1">
                            {r.estado_validacao === "pendente" ? "P" : r.estado_validacao === "validado" ? "V" : "R"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); startEdit(r); }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
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
  );
}
