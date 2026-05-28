import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_DIRECT_COST_LINES } from "@/types/closing-sheet";

export type BudgetMode = "remodelacao" | "construcao_nova";

/**
 * Seeds the 38 canonical chapters (from DEFAULT_DIRECT_COST_LINES) into an
 * existing budget. Used when the user picks "Construção Nova" on the advanced
 * budget creation flow. No articles are created — the user fills them in via
 * the catalog / parametric tools afterwards.
 *
 * Returns the number of inserted chapters.
 */
export async function seedCanonicalChapters(orcamentoId: string): Promise<number> {
  // Strip leading "NN - " prefix from the label so we don't end up with double
  // numbering (the `numero` field already carries the chapter number).
  const inserts = DEFAULT_DIRECT_COST_LINES.map((line, idx) => {
    const cleanTitle = line.label.replace(/^\d+\s*-\s*/, "").trim();
    return {
      orcamento_id: orcamentoId,
      numero: idx + 1,
      titulo: cleanTitle,
      ordem: idx + 1,
    };
  });

  const { data, error } = await supabase
    .from("capitulos_orcamento")
    .insert(inserts)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}
