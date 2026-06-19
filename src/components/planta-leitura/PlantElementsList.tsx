import { useState } from "react";
import { Check, Edit2, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { reviewElement } from "@/hooks/usePlantLeitura";
import type { PlantElement } from "@/types/planta-leitura";

interface Props {
  elements: PlantElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChanged: () => void;
}

function statusBadge(s: PlantElement["status"]) {
  const map: Record<string, { label: string; cls: string }> = {
    ok: { label: "OK", cls: "bg-emerald-100 text-emerald-800" },
    review: { label: "Rever", cls: "bg-amber-100 text-amber-800" },
    approved: { label: "Aprovado", cls: "bg-primary/15 text-primary" },
    edited: { label: "Editado", cls: "bg-blue-100 text-blue-800" },
    ignored: { label: "Ignorado", cls: "bg-muted text-muted-foreground" },
    error: { label: "Erro", cls: "bg-destructive/15 text-destructive" },
    proposed: { label: "Proposto", cls: "bg-purple-100 text-purple-800" },
  };
  const m = map[s] || map.ok;
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${m.cls}`}>{m.label}</span>;
}

export function PlantElementsList({ elements, selectedId, onSelect, onChanged }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<PlantElement>>({});

  if (elements.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground text-center">Nenhum elemento extraído nesta folha.</div>;
  }

  const startEdit = (el: PlantElement) => {
    setEditing(el.id);
    setDraft({ code: el.code || "", description: el.description || "", quantity: el.quantity, unit: el.unit || "" });
  };
  const saveEdit = async (id: string) => {
    await reviewElement(id, "edit", draft);
    setEditing(null);
    onChanged();
  };

  return (
    <div className="space-y-2">
      {elements.map((el) => {
        const isSel = el.id === selectedId;
        const isEdit = el.id === editing;
        return (
          <Card
            key={el.id}
            onClick={() => onSelect(el.id)}
            className={`p-3 cursor-pointer transition ${isSel ? "ring-2 ring-primary" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-semibold">{el.code || "—"}</span>
                  {el.category && <Badge variant="outline" className="text-[10px]">{el.category}</Badge>}
                  {statusBadge(el.status)}
                </div>
                {isEdit ? (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input className="h-8 col-span-2" placeholder="Descrição" value={draft.description as string || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                    <Input className="h-8" type="number" placeholder="Qtd" value={draft.quantity ?? ""} onChange={(e) => setDraft({ ...draft, quantity: parseFloat(e.target.value) })} />
                    <Input className="h-8" placeholder="Unidade" value={draft.unit as string || ""} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
                  </div>
                ) : (
                  <>
                    <div className="text-sm mt-1 line-clamp-2">{el.description || "—"}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      QTD {el.quantity ?? "—"} {el.unit || ""}
                      {el.confidence !== null && <> · CONF {Math.round(el.confidence * 100)}%</>}
                      {el.read_method && <> · {el.read_method}</>}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
              {isEdit ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                  <Button size="sm" onClick={() => saveEdit(el.id)}>Guardar</Button>
                </>
              ) : (
                <>
                  {el.status !== "approved" && (
                    <Button size="sm" variant="default" className="h-7 px-2" onClick={async () => { await reviewElement(el.id, "approve"); onChanged(); }}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => startEdit(el)}>
                    <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  {el.status !== "ignored" ? (
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={async () => { await reviewElement(el.id, "ignore"); onChanged(); }}>
                      <X className="h-3.5 w-3.5 mr-1" /> Ignorar
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={async () => { await reviewElement(el.id, "reset"); onChanged(); }}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Repor
                    </Button>
                  )}
                </>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
