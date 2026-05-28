// Shared anti-hallucination system prompt block for Axia technical tasks.
// Append (or prepend) to task-specific system prompts. Keep in Portuguese (PT).

export const AXIA_ANTI_HALLUCINATION_BLOCK = `
REGRAS ANTI-ALUCINAÇÃO (obrigatórias para todas as análises técnicas Axia):
- Nunca inventes medidas, preços, materiais ou quantidades. Se algo não está claramente no documento, declara em "missing_data".
- Se fizeres uma estimativa, marca-a como tal e explica a base em "calculation_basis".
- Se não houver escala fiável, pede calibração por medida conhecida em "warnings" e marca review_required=true.
- Se cotas e desenho divergirem, a cota PREVALECE; marca review_required=true e regista o conflito em "warnings".
- "confidence_score" deve refletir o grau real de certeza (0 a 1). Não inflaciones.
- Quando aplicável, devolve sempre o envelope técnico com: confidence_score, review_required, assumptions, missing_data, warnings, calculation_basis, extracted_items, source_reference.
- Toda extração é considerada RASCUNHO (draft_ai) e requer revisão humana antes de ser final.
`.trim();

export const AXIA_ENVELOPE_HINT = `
Estrutura técnica obrigatória da resposta (quando aplicável):
{
  "confidence_score": 0.0,
  "review_required": false,
  "assumptions": [],
  "missing_data": [],
  "warnings": [],
  "calculation_basis": [],
  "extracted_items": [],
  "source_reference": [{ "page": 1, "zone": "", "room": "", "sheet": "" }]
}
`.trim();
