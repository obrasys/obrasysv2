import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minus, Hash, Pentagon, Trash2, Check, X, Pencil } from "lucide-react";
import type { PlanMeasurement } from "@/types/plan-measurements";
import { useState } from "react";

interface PlanMeasurementsListProps {
  measurements: PlanMeasurement[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: { etiqueta?: string; valor_ajustado?: number; estado_validacao?: string; camada?: string }) => void;
}

const TIPO_ICON: Record<string, typeof Minus> = {
  linha: Minus,
  area: Pentagon,
  contagem: Hash,
};

const TIPO_LABEL: Record<string, string> = {
  linha: "Linha",
  contagem: "Contagem",
  area: "Área",
};

const ESTADO_COLORS: Record<string, "secondary" | "default" | "destructive"> = {
  pendente: "secondary",
  validado: "default",
  rejeitado: "destructive",
};

export function PlanMeasurementsList({ measurements, onDelete, onUpdate }: PlanMeasurementsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const startEdit = (m: PlanMeasurement) => {
    setEditingId(m.id);
    setEditLabel(m.etiqueta || "");
  };

  const saveEdit = (id: string) => {
    onUpdate(id, { etiqueta: editLabel });
    setEditingId(null);
  };

  const linhas = measurements.filter((m) => m.tipo === "linha");
  const areas = measurements.filter((m) => m.tipo === "area");
  const contagens = measurements.filter((m) => m.tipo === "contagem");

  const totalLength = linhas.reduce((s, m) => s + (m.valor_final ?? m.valor_bruto), 0);
  const totalArea = areas.reduce((s, m) => s + (m.valor_final ?? m.valor_bruto), 0);
  const totalCount = contagens.reduce((s, m) => s + (m.valor_final ?? m.valor_bruto), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>Medições ({measurements.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {measurements.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-muted-foreground">
              Nenhuma medição. Use as ferramentas acima para medir.
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="px-4 pb-2 flex gap-3 text-xs">
              {linhas.length > 0 && (
                <span className="text-muted-foreground">
                  <Minus className="w-3 h-3 inline mr-0.5" /> {totalLength.toFixed(2)} m
                </span>
              )}
              {areas.length > 0 && (
                <span className="text-muted-foreground">
                  <Pentagon className="w-3 h-3 inline mr-0.5" /> {totalArea.toFixed(2)} m²
                </span>
              )}
              {contagens.length > 0 && (
                <span className="text-muted-foreground">
                  <Hash className="w-3 h-3 inline mr-0.5" /> {totalCount} un
                </span>
              )}
            </div>

            <ScrollArea className="max-h-[400px]">
              <div className="divide-y">
                {measurements.map((m, idx) => {
                  const Icon = TIPO_ICON[m.tipo] ?? Minus;
                  return (
                    <div key={m.id} className="px-4 py-2.5 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.cor }} />
                          <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {editingId === m.id ? (
                            <div className="flex items-center gap-1 flex-1">
                              <Input
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                className="h-6 text-xs"
                                placeholder="Etiqueta..."
                                autoFocus
                                onKeyDown={(e) => e.key === "Enter" && saveEdit(m.id)}
                              />
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => saveEdit(m.id)}>
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs truncate cursor-pointer" onClick={() => startEdit(m)}>
                              {m.etiqueta || `${TIPO_LABEL[m.tipo]} ${idx + 1}`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-mono font-medium">
                            {m.valor_bruto.toFixed(m.tipo === "contagem" ? 0 : 2)} {m.unidade}
                          </span>
                          <Badge variant={ESTADO_COLORS[m.estado_validacao]} className="text-[9px] h-4 px-1">
                            {m.estado_validacao === "pendente" ? "P" : m.estado_validacao === "validado" ? "V" : "R"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => onDelete(m.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {m.camada && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 ml-[26px]">
                          Camada: {m.camada}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
