// Mapping between Essencial v2 area keys and Base de Preços (capitulo / tipo_base).
// Used by ItemSelectorModal to fetch artigos da Base do utilizador filtrados por área.

import type { BudgetType } from "@/types/orcamento-essencial";
import type { TipoBase } from "@/hooks/useBaseArtigos";

/** Returns the tipo_base used to filter the Base for a given budget type. */
export function tipoBaseForBudget(type: BudgetType): TipoBase {
  // Apenas Remodelação tem base dedicada hoje. Os restantes usam a base "geral".
  return type === "remodelacao" ? "remodelacao" : "geral";
}

/**
 * Keywords (substrings) to match against `capitulo` (case-insensitive) for each areaKey.
 * The matching uses `ilike %kw%` on the DB side, joining several keywords via OR.
 * Empty array => sem filtro de capítulo (mostra tudo da tipo_base).
 */
export const AREA_TO_CAPITULO_KEYWORDS: Record<string, string[]> = {
  // ----- Remodelação (areaKey) -----
  aguas_esgotos: ["canaliza", "saneamento"],
  ar_condicionados: ["avac", "ventila"],
  capoto: ["isolamento", "impermeabiliza", "revestiment"],
  carpintaria: ["carpintar"],
  casa_banho: ["canaliza", "cerâmic", "revestiment"],
  cozinha: ["carpintar", "cerâmic"],
  demolicoes_recolha: ["demoli", "limpeza"],
  demolicoes: ["demoli"],
  deslocacao_estaleiro: ["limpeza", "exterior", "diverso"],
  eletrica: ["eletricidade", "elétric"],
  impermeabilizacao: ["impermeabiliza", "isolamento"],
  imprevistos_tpu: ["geral", "diverso"],
  jardim: ["exterior", "limpeza"],
  pavimentos_rodapes: ["paviment"],
  pinturas: ["pintura", "tinta"],
  piscinas: ["impermeabiliza", "canaliza"],
  pladur: ["gesso", "teto"],
  serralharia_caixilharia: ["serralhar", "caixilhar"],
  tectos_sancas: ["gesso", "teto"],
  telhados: ["isolamento", "impermeabiliza"],

  // ----- Construção Nova (capítulo geral) -----
  preparacao_terras: ["movimento de terras", "trabalhos preparat"],
  fundacoes_laje: ["betão", "estrutura"],
  estrutura_betao: ["betão", "estrutura"],
  paredes_exteriores: ["alvenaria", "reboco"],
  paredes_interiores: ["alvenaria", "reboco"],
  coberturas_telhados: ["isolamento", "impermeabiliza"],
  impermeabilizacao_isolamento: ["isolamento", "impermeabiliza"],
  instalacoes_aguas: ["canaliza", "saneamento"],
  instalacoes_eletricas: ["eletricidade", "ited"],
  rebocos_estuques: ["alvenaria", "reboco"],
  tetos_falsos_pladur: ["gesso", "teto"],
  pavimentos_revestimentos: ["paviment", "revestiment"],
  caixilharias_exteriores: ["serralhar", "caixilhar"],
  carpintarias_interiores: ["carpintar"],
  pinturas_cn: ["pintura"],
  loucas_sanitarios: ["canaliza"],
  arranjos_exteriores: ["exterior", "limpeza"],

  // ----- LSF (mesmo mapping base "geral") -----
  lsf_preparacao_terras: ["movimento de terras", "trabalhos preparat"],
  lsf_fundacao_laje: ["betão", "estrutura"],
  lsf_estrutura: ["serralhar", "estrutura"],
  lsf_fecho_exterior: ["isolamento", "revestiment"],
  lsf_divisorias: ["gesso"],
  lsf_cobertura: ["isolamento", "impermeabiliza"],
  lsf_isolamentos: ["isolamento"],
  lsf_fachada: ["revestiment"],
  lsf_instalacoes_aguas: ["canaliza"],
  lsf_instalacoes_eletricas: ["eletricidade"],
  lsf_rebocos_estuques: ["alvenaria", "reboco"],
  lsf_tetos_falsos: ["gesso", "teto"],
  lsf_pavimentos: ["paviment", "revestiment"],
  lsf_caixilharias: ["serralhar", "caixilhar"],
  lsf_carpintarias: ["carpintar"],
  lsf_pinturas: ["pintura"],
  lsf_loucas_sanitarios: ["canaliza"],
  lsf_arranjos_exteriores: ["exterior", "limpeza"],

  // ----- ICF -----
  icf_preparacao_terras: ["movimento de terras", "trabalhos preparat"],
  icf_fundacoes_laje: ["betão", "estrutura"],
  icf_paredes_estruturais: ["betão", "estrutura"],
  icf_lajes_cobertura: ["betão", "estrutura"],
  icf_impermeabilizacao: ["impermeabiliza", "isolamento"],
  icf_instalacoes_aguas: ["canaliza"],
  icf_instalacoes_eletricas: ["eletricidade"],
  icf_revestimento_interior: ["revestiment", "alvenaria"],
  icf_revestimento_exterior: ["revestiment", "isolamento"],
  icf_tetos_falsos: ["gesso", "teto"],
  icf_pavimentos: ["paviment"],
  icf_caixilharias: ["serralhar", "caixilhar"],
  icf_carpintarias: ["carpintar"],
  icf_pinturas: ["pintura"],
  icf_loucas_sanitarios: ["canaliza"],
  icf_arranjos_exteriores: ["exterior", "limpeza"],
};

export function keywordsForArea(areaKey: string): string[] {
  return AREA_TO_CAPITULO_KEYWORDS[areaKey] || [];
}
