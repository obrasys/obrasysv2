import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileDown, Loader2, Plug } from "lucide-react";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getSymbolById, type PlacedPlantElement } from "@/types/plan-symbols";

import { DISCIPLINE_META } from "@/lib/plan-discipline";

interface Props {
  elements: PlacedPlantElement[];
  obraId: string;
  disciplina?: import("@/types/plan-measurements").PlanDisciplina | null;
}

interface GroupedElement {
  symbolTypeId: string;
  name: string;
  subcategory: string;
  count: number;
}

export function PlanElementsExportBudget({ elements, obraId, disciplina }: Props) {
  const { orcamentos } = useOrcamentos();
  const [selectedOrcamento, setSelectedOrcamento] = useState("");
  const [inserting, setInserting] = useState(false);

  const obraOrcamentos = (orcamentos ?? []).filter((o) => o.obra_id === obraId);

  // Group elements by symbol type
  const grouped = useMemo(() => {
    const map = new Map<string, GroupedElement>();
    elements.forEach((el) => {
      const existing = map.get(el.symbolTypeId);
      if (existing) {
        existing.count += (el.quantity ?? 1);
      } else {
        const sym = getSymbolById(el.symbolTypeId);
        map.set(el.symbolTypeId, {
          symbolTypeId: el.symbolTypeId,
          name: sym?.name ?? el.symbolTypeId,
          subcategory: sym?.subcategory ?? "geral",
          count: el.quantity ?? 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.subcategory.localeCompare(b.subcategory));
  }, [elements]);

  const handleExport = async () => {
    if (!selectedOrcamento || grouped.length === 0) return;
    setInserting(true);

    try {
      // Get next chapter number
      const { data: chapters } = await supabase
        .from("capitulos_orcamento")
        .select("numero")
        .eq("orcamento_id", selectedOrcamento)
        .order("numero", { ascending: false })
        .limit(1);

      const nextNum = (chapters && chapters.length > 0 ? chapters[0].numero : 0) + 1;

      // Create chapter for plan elements
      const { data: chapter, error: chError } = await supabase
        .from("capitulos_orcamento")
        .insert({
          orcamento_id: selectedOrcamento,
          numero: nextNum,
          titulo: "Elementos de Planta - Instalações",
          ordem: nextNum,
        })
        .select()
        .single();

      if (chError) throw chError;

      // Create articles from grouped elements
      const articles = grouped.map((g, idx) => ({
        capitulo_id: chapter.id,
        descricao: g.name,
        unidade: "un",
        quantidade: g.count,
        preco_unitario: 0,
        ordem: idx + 1,
      }));

      const { error: artError } = await supabase
        .from("artigos_orcamento")
        .insert(articles);

      if (artError) throw artError;

      toast.success(`${grouped.length} artigos inseridos no orçamento (${elements.length} elementos)`);
      setSelectedOrcamento("");
    } catch (e: any) {
      toast.error("Erro ao exportar: " + e.message);
    } finally {
      setInserting(false);
    }
  };

  if (elements.length === 0) return null;

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        <Plug className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Exportar para Orçamento</span>
        <Badge variant="secondary" className="text-[10px]">{elements.length} elementos</Badge>
      </div>

      {/* Summary */}
      <div className="space-y-1">
        {grouped.map((g) => (
          <div key={g.symbolTypeId} className="flex justify-between text-xs text-muted-foreground">
            <span>{g.name}</span>
            <span className="font-mono">{g.count} un</span>
          </div>
        ))}
      </div>

      {/* Export controls */}
      <div className="flex flex-col gap-2">
        <Select value={selectedOrcamento} onValueChange={setSelectedOrcamento}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecionar orçamento..." />
          </SelectTrigger>
          <SelectContent>
            {obraOrcamentos.length === 0 ? (
              <SelectItem value="__none" disabled>Nenhum orçamento nesta obra</SelectItem>
            ) : (
              obraOrcamentos.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.titulo}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          onClick={handleExport}
          disabled={!selectedOrcamento || inserting}
          size="sm"
          className="gap-1.5 w-full"
        >
          {inserting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Inserir no Orçamento
        </Button>
      </div>
    </div>
  );
}
