/**
 * Anti-duplicação cross-disciplina entre arquitetura e estrutura.
 *
 * Regras:
 *  1. Para o mesmo piso e mesmo elemento (paredes/lajes/pilares), se existir folha
 *     de ESTRUTURA, ela prevalece. As linhas de arquitetura desse elemento são
 *     suprimidas (marcadas duplicated_by="structure").
 *  2. Cortes e alçados → nunca são quantitativo principal; ficam como validacao_apenas.
 *  3. Pormenores ICF / metálicos → só validam composição.
 *  4. Acabamentos, compartimentos, áreas e vãos → sempre arquitetura.
 */

export type Disciplina = "arquitetura" | "estrutura" | "mep" | "outro";
export type EstadoQuantitativo =
  | "confirmado_por_projeto_estrutura"
  | "sugestao_preliminar"
  | "manual"
  | "extraido_arquitetura"
  | "validacao_apenas"
  | "duplicado_suprimido";

export interface DedupableItem {
  id: string;
  capitulo?: string | null;
  artigo?: string | null;
  descricao?: string | null;
  unidade?: string | null;
  quantidade?: number | null;
  piso_origem?: string | null;
  folha_origem?: string | null;
  pagina_origem?: number | null;
  disciplina_origem?: Disciplina | string | null;
  tipo_folha_origem?: string | null;
  estado_quantitativo?: EstadoQuantitativo | string | null;
  confidence_score?: number | null;
}

const STRUCTURAL_ELEMENT_KEYWORDS = [
  "parede estrutural", "pared estrutur", "icf",
  "laje", "pilar", "viga", "fundacao", "fundação", "sapata",
  "armadura", "perfil metalic", "perfil metálico",
];

const VALIDATION_ONLY_TYPES = new Set([
  "elevation", "alcado", "section", "corte",
  "icf_detail", "pormenor_icf",
  "metallic_structure_detail", "pormenor_metalico",
]);

function isStructuralElement(item: DedupableItem): boolean {
  const txt = `${item.capitulo ?? ""} ${item.artigo ?? ""} ${item.descricao ?? ""}`.toLowerCase();
  return STRUCTURAL_ELEMENT_KEYWORDS.some((kw) => txt.includes(kw));
}

/**
 * Aplica regras cross-disciplina. Devolve a nova lista (mesmo tamanho) com
 * estado_quantitativo ajustado.
 */
export function dedupeAcrossDisciplines<T extends DedupableItem>(items: T[]): T[] {
  // 1) Mark validation-only origin types
  const stage1 = items.map((it) => {
    if (it.tipo_folha_origem && VALIDATION_ONLY_TYPES.has(it.tipo_folha_origem)) {
      return { ...it, estado_quantitativo: "validacao_apenas" as const };
    }
    return it;
  });

  // 2) Build set of (piso) where structure exists for structural elements
  const structuralFloors = new Set<string>();
  for (const it of stage1) {
    if (
      it.disciplina_origem === "estrutura" &&
      it.piso_origem &&
      it.estado_quantitativo !== "validacao_apenas" &&
      isStructuralElement(it)
    ) {
      structuralFloors.add(it.piso_origem);
    }
  }

  // 3) Suppress architecture-origin structural items where structure exists
  return stage1.map((it) => {
    if (
      it.disciplina_origem === "arquitetura" &&
      it.piso_origem &&
      structuralFloors.has(it.piso_origem) &&
      isStructuralElement(it)
    ) {
      return { ...it, estado_quantitativo: "duplicado_suprimido" as const };
    }
    return it;
  });
}

export const ESTADO_QUANTITATIVO_LABEL: Record<string, string> = {
  confirmado_por_projeto_estrutura: "Confirmado por projeto de estrutura",
  sugestao_preliminar: "Sugestão preliminar",
  manual: "Manual",
  extraido_arquitetura: "Extraído da arquitetura",
  validacao_apenas: "Apenas validação",
  duplicado_suprimido: "Duplicado (suprimido)",
};

export const ESTADO_QUANTITATIVO_TONE: Record<string, string> = {
  confirmado_por_projeto_estrutura: "bg-emerald-100 text-emerald-800 border-emerald-200",
  sugestao_preliminar: "bg-amber-100 text-amber-800 border-amber-200",
  manual: "bg-slate-100 text-slate-700 border-slate-200",
  extraido_arquitetura: "bg-blue-100 text-blue-700 border-blue-200",
  validacao_apenas: "bg-violet-100 text-violet-700 border-violet-200",
  duplicado_suprimido: "bg-rose-100 text-rose-700 border-rose-200",
};
