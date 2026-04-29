import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Minus,
  Hash,
  Pentagon,
  Trash2,
  Check,
  X,
  Hammer,
  Wrench,
  Paintbrush,
  Layers,
  Brush,
  SlidersHorizontal,
} from "lucide-react";
import type { PlanMeasurement, SegmentActionType } from "@/types/plan-measurements";
import { ConfidenceBadge } from "@/components/plantas/ConfidenceBadge";
import { useState } from "react";

interface PlanMeasurementsListProps {
  measurements: PlanMeasurement[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: { etiqueta?: string; valor_ajustado?: number; estado_validacao?: string; camada?: string }) => void;
  onEditSegment?: (measurement: PlanMeasurement) => void;
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

const ACTION_META: Record<SegmentActionType, { label: string; icon: typeof Hammer; tone: string; bg: string }> = {
  demolir: { label: "Demolir", icon: Hammer, tone: "text-destructive", bg: "bg-destructive/10" },
  construir: { label: "Construir", icon: Wrench, tone: "text-primary", bg: "bg-primary/10" },
  barrar: { label: "Barrar", icon: Layers, tone: "text-amber-700", bg: "bg-amber-100" },
  pintar: { label: "Pintar", icon: Paintbrush, tone: "text-blue-700", bg: "bg-blue-100" },
  revestir: { label: "Revestir", icon: Brush, tone: "text-purple-700", bg: "bg-purple-100" },
};

export function PlanMeasurementsList({ measurements, onDelete, onUpdate, onEditSegment }: PlanMeasurementsListProps) {
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

            <div className="max-h-[55vh] overflow-y-auto overscroll-contain pr-1 xl:max-h-[400px]">
              <div className="divide-y">
                {measurements.map((m, idx) => {
                  const Icon = TIPO_ICON[m.tipo] ?? Minus;
                  const action = m.action_type ? ACTION_META[m.action_type] : null;
                  const ActionIcon = action?.icon;
                  const isSegment = !!m.action_type;
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
                          {(m as any).confidence && (
                            <ConfidenceBadge
                              level={(m as any).confidence}
                              origin={(m as any).measurement_origin}
                            />
                          )}
                          {isSegment && onEditSegment && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-primary"
                              onClick={() => onEditSegment(m)}
                              title="Editar segmento"
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                            </Button>
                          )}
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

                      {/* Structured segment metadata */}
                      {isSegment && action && ActionIcon && (
                        <div className="mt-1.5 ml-[26px] flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${action.bg} ${action.tone}`}>
                            <ActionIcon className="w-2.5 h-2.5" />
                            {action.label}
                          </span>
                          {m.wall_area != null && m.wall_area > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              área {m.wall_area.toFixed(2)} m²
                            </span>
                          )}
                          {m.wall_thickness_cm != null && m.wall_thickness_cm > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              e={m.wall_thickness_cm} cm
                            </span>
                          )}
                          {m.demolition_volume != null && m.demolition_volume > 0 && (
                            <span className="text-[10px] text-destructive">
                              vol {m.demolition_volume.toFixed(3)} m³
                            </span>
                          )}
                          {m.material_label && (
                            <span className="text-[10px] text-muted-foreground italic">
                              · {m.material_label}
                            </span>
                          )}
                        </div>
                      )}

                      {m.camada && !isSegment && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 ml-[26px]">
                          Camada: {m.camada}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
