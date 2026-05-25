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
  aguas_esgotos: ["canaliza", "saneamento", "hidr", "água", "agua", "esgoto"],
  ar_condicionados: ["avac", "ventila", "ar condicion", "climatiz"],
  capoto: ["isolamento", "impermeabiliza", "revestiment", "capoto", "etics", "fachad"],
  carpintaria: ["carpintar", "madeir", "porta", "armário", "armario"],
  casa_banho: ["canaliza", "cerâmic", "ceramic", "revestiment", "sanit", "louç", "louc", "hidr", "wc", "banho"],
  cozinha: ["carpintar", "cerâmic", "ceramic", "cozinha", "móvel", "movel"],
  demolicoes_recolha: ["demoli", "limpeza", "remoç", "remoc"],
  demolicoes: ["demoli", "remoç", "remoc"],
  deslocacao_estaleiro: ["limpeza", "exterior", "diverso", "prelimin", "estaleiro", "obra"],
  eletrica: ["eletricidade", "elétric", "eletric", "ited", "instalaç", "instalac"],
  impermeabilizacao: ["impermeabiliza", "isolamento"],
  imprevistos_tpu: ["geral", "diverso", "prelimin"],
  jardim: ["exterior", "limpeza", "arranjo", "jardim", "paisag"],
  pavimentos_rodapes: ["paviment", "rodapé", "rodape", "revestiment"],
  pinturas: ["pintura", "tinta"],
  piscinas: ["impermeabiliza", "canaliza", "piscina"],
  pladur: ["gesso", "teto", "tecto", "pladur", "drywall"],
  serralharia_caixilharia: ["serralhar", "caixilhar", "alumín", "alumin"],
  tectos_sancas: ["gesso", "teto", "tecto", "sanca", "pladur"],
  telhados: ["isolamento", "impermeabiliza", "cobertur", "telha"],

  // ----- Construção Nova (capítulo geral) -----
  preparacao_terras: ["movimento de terras", "trabalhos preparat", "prelimin", "estaleiro", "terra", "escavaç", "escavac"],
  fundacoes_laje: ["betão", "betao", "estrutura", "fundaç", "fundac", "laje", "alvenari"],
  estrutura_betao: ["betão", "betao", "estrutura", "alvenari", "pilar", "viga"],
  paredes_exteriores: ["alvenaria", "reboco", "parede", "estrutura"],
  paredes_interiores: ["alvenaria", "reboco", "parede", "divis"],
  coberturas_telhados: ["isolamento", "impermeabiliza", "cobertur", "telha"],
  impermeabilizacao_isolamento: ["isolamento", "impermeabiliza"],
  instalacoes_aguas: ["canaliza", "saneamento", "hidr", "água", "agua", "instalaç", "instalac"],
  instalacoes_eletricas: ["eletricidade", "elétric", "eletric", "ited", "instalaç", "instalac"],
  rebocos_estuques: ["alvenaria", "reboco", "estuque"],
  tetos_falsos_pladur: ["gesso", "teto", "tecto", "pladur"],
  pavimentos_revestimentos: ["paviment", "revestiment", "cerâmic", "ceramic"],
  caixilharias_exteriores: ["serralhar", "caixilhar", "alumín", "alumin", "janela"],
  carpintarias_interiores: ["carpintar", "porta", "madeir"],
  pinturas_cn: ["pintura", "tinta"],
  loucas_sanitarios: ["canaliza", "sanit", "louç", "louc"],
  arranjos_exteriores: ["exterior", "limpeza", "arranjo", "paisag"],

  // ----- LSF (mesmo mapping base "geral") -----
  lsf_preparacao_terras: ["movimento de terras", "trabalhos preparat", "prelimin", "estaleiro"],
  lsf_fundacao_laje: ["betão", "betao", "estrutura", "fundaç", "fundac", "laje"],
  lsf_estrutura: ["serralhar", "estrutura", "lsf", "aço", "aco"],
  lsf_fecho_exterior: ["isolamento", "revestiment", "fachad"],
  lsf_divisorias: ["gesso", "divis", "pladur"],
  lsf_cobertura: ["isolamento", "impermeabiliza", "cobertur", "telha"],
  lsf_isolamentos: ["isolamento"],
  lsf_fachada: ["revestiment", "fachad"],
  lsf_instalacoes_aguas: ["canaliza", "hidr", "água", "agua", "instalaç", "instalac"],
  lsf_instalacoes_eletricas: ["eletricidade", "elétric", "eletric", "instalaç", "instalac"],
  lsf_rebocos_estuques: ["alvenaria", "reboco", "estuque"],
  lsf_tetos_falsos: ["gesso", "teto", "tecto", "pladur"],
  lsf_pavimentos: ["paviment", "revestiment"],
  lsf_caixilharias: ["serralhar", "caixilhar", "alumín", "alumin"],
  lsf_carpintarias: ["carpintar", "porta", "madeir"],
  lsf_pinturas: ["pintura", "tinta"],
  lsf_loucas_sanitarios: ["canaliza", "sanit", "louç", "louc"],
  lsf_arranjos_exteriores: ["exterior", "limpeza", "arranjo", "paisag"],

  // ----- ICF -----
  icf_preparacao_terras: ["movimento de terras", "trabalhos preparat", "prelimin", "estaleiro"],
  icf_fundacoes_laje: ["betão", "betao", "estrutura", "fundaç", "fundac", "laje"],
  icf_paredes_estruturais: ["betão", "betao", "estrutura", "parede", "icf"],
  icf_lajes_cobertura: ["betão", "betao", "estrutura", "laje", "cobertur"],
  icf_impermeabilizacao: ["impermeabiliza", "isolamento"],
  icf_instalacoes_aguas: ["canaliza", "hidr", "água", "agua", "instalaç", "instalac"],
  icf_instalacoes_eletricas: ["eletricidade", "elétric", "eletric", "instalaç", "instalac"],
  icf_revestimento_interior: ["revestiment", "alvenaria", "reboco"],
  icf_revestimento_exterior: ["revestiment", "isolamento", "fachad"],
  icf_tetos_falsos: ["gesso", "teto", "tecto", "pladur"],
  icf_pavimentos: ["paviment", "revestiment"],
  icf_caixilharias: ["serralhar", "caixilhar", "alumín", "alumin"],
  icf_carpintarias: ["carpintar", "porta", "madeir"],
  icf_pinturas: ["pintura", "tinta"],
  icf_loucas_sanitarios: ["canaliza", "sanit", "louç", "louc"],
  icf_arranjos_exteriores: ["exterior", "limpeza", "arranjo", "paisag"],
};

export function keywordsForArea(areaKey: string): string[] {
  return AREA_TO_CAPITULO_KEYWORDS[areaKey] || [];
}
