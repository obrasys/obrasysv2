import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { PlantElement } from "@/types/planta-leitura";

const CHAPTERS = [
  "Estrutura",
  "Fundações",
  "Paredes ICF",
  "Lajes",
  "Cobertura",
  "Instalações elétricas",
  "Instalações hidráulicas",
  "Acabamentos",
  "Outros",
];

interface Props {
  elements: PlantElement[];
  onChanged: () => void;
}

export function PlantPackagesList({ elements, onChanged }: Props) {
  const groups = new Map<string, PlantElement[]>();
  for (const e of elements) {
    if (e.status === "ignored") continue;
    const k = e.budget_chapter_suggestion || e.category || "Outros";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }

  const reassign = async (els: PlantElement[], chap: string) => {
    await supabase.from("plant_elements" as any).update({ budget_chapter_suggestion: chap }).in("id", els.map(e => e.id));
    onChanged();
  };

  if (groups.size === 0) {
    return <div className="p-6 text-sm text-muted-foreground text-center">Sem pacotes definidos.</div>;
  }

  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([name, list]) => (
        <Card key={name} className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">{name}</div>
              <div className="text-xs text-muted-foreground">{list.length} {list.length === 1 ? "item" : "itens"} · {list.filter(e => e.status === "approved").length} aprovados</div>
            </div>
            <Select onValueChange={(v) => reassign(list, v)}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Reatribuir capítulo" /></SelectTrigger>
              <SelectContent>{CHAPTERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </Card>
      ))}
    </div>
  );
}
