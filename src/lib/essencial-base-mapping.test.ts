import { describe, it, expect } from "vitest";
import {
  AREA_TO_CAPITULO_KEYWORDS,
  keywordsForArea,
  tipoBaseForBudget,
} from "./essencial-base-mapping";

/** Simula o `capitulo ilike %kw%` do lado da DB (case-insensitive, qualquer keyword bate). */
function matches(capitulo: string, areaKey: string): boolean {
  const kws = keywordsForArea(areaKey);
  if (kws.length === 0) return true; // sem filtro => bate sempre
  const c = capitulo.toLowerCase();
  return kws.some((kw) => c.includes(kw.toLowerCase()));
}

describe("tipoBaseForBudget", () => {
  it("retorna 'remodelacao' apenas para remodelação", () => {
    expect(tipoBaseForBudget("remodelacao")).toBe("remodelacao");
  });

  it.each([
    "construcao_nova",
    "lsf",
    "icf",
  ] as const)("retorna 'geral' para %s", (t) => {
    expect(tipoBaseForBudget(t as any)).toBe("geral");
  });
});

describe("AREA_TO_CAPITULO_KEYWORDS - integridade", () => {
  it("não tem areaKey duplicadas (garantido pelo objeto)", () => {
    const keys = Object.keys(AREA_TO_CAPITULO_KEYWORDS);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("todas as áreas têm pelo menos 1 keyword", () => {
    for (const [area, kws] of Object.entries(AREA_TO_CAPITULO_KEYWORDS)) {
      expect(kws.length, `area ${area} sem keywords`).toBeGreaterThan(0);
    }
  });

  it("keywords são lowercase, sem espaços extra e não vazias", () => {
    for (const [area, kws] of Object.entries(AREA_TO_CAPITULO_KEYWORDS)) {
      for (const kw of kws) {
        expect(kw, `area ${area}`).toBe(kw.trim());
        expect(kw.length, `area ${area} kw vazia`).toBeGreaterThan(0);
        expect(kw, `area ${area} kw com maiúsculas: ${kw}`).toBe(kw.toLowerCase());
      }
    }
  });
});

describe("keywordsForArea", () => {
  it("retorna [] para areaKey desconhecida", () => {
    expect(keywordsForArea("nao_existe_xyz")).toEqual([]);
  });
});

/**
 * Casos representativos: para cada areaKey um (ou mais) capítulos reais
 * que DEVEM ser apanhados pelas keywords da área.
 */
const POSITIVE_CASES: Array<[string, string]> = [
  // Remodelação
  ["aguas_esgotos", "Canalizações e Saneamento"],
  ["aguas_esgotos", "Instalações Hidráulicas"],
  ["ar_condicionados", "AVAC - Ar Condicionado"],
  ["ar_condicionados", "Climatização e Ventilação"],
  ["capoto", "Isolamento térmico - ETICS / Capoto"],
  ["capoto", "Revestimento de Fachada"],
  ["carpintaria", "Carpintarias interiores"],
  ["carpintaria", "Portas e Armários"],
  ["casa_banho", "Loiças sanitárias WC"],
  ["casa_banho", "Revestimentos cerâmicos casa de banho"],
  ["cozinha", "Móveis de Cozinha"],
  ["cozinha", "Revestimentos cerâmicos cozinha"],
  ["demolicoes_recolha", "Demolições e remoção de entulho"],
  ["demolicoes_recolha", "Limpeza de obra"],
  ["demolicoes", "Demolições gerais"],
  ["deslocacao_estaleiro", "Estaleiro de obra"],
  ["deslocacao_estaleiro", "Trabalhos preliminares"],
  ["eletrica", "Instalações Elétricas - ITED"],
  ["impermeabilizacao", "Impermeabilizações"],
  ["impermeabilizacao", "Isolamento térmico"],
  ["imprevistos_tpu", "Trabalhos Diversos"],
  ["imprevistos_tpu", "Despesas gerais"],
  ["jardim", "Arranjos exteriores - Jardim"],
  ["jardim", "Paisagismo"],
  ["pavimentos_rodapes", "Pavimentos e Rodapés"],
  ["pinturas", "Pinturas e Tintas"],
  ["piscinas", "Piscinas - Impermeabilização"],
  ["pladur", "Tetos em Pladur / Gesso Cartonado"],
  ["serralharia_caixilharia", "Serralharias e Caixilharias de Alumínio"],
  ["tectos_sancas", "Tetos e Sancas em Gesso"],
  ["telhados", "Coberturas e Telhados"],

  // Construção Nova
  ["preparacao_terras", "Movimento de Terras e Escavações"],
  ["preparacao_terras", "Trabalhos preparatórios"],
  ["fundacoes_laje", "Betão Armado - Fundações e Lajes"],
  ["estrutura_betao", "Estrutura de Betão - Pilares e Vigas"],
  ["paredes_exteriores", "Alvenaria de Paredes Exteriores"],
  ["paredes_interiores", "Divisórias e Paredes Interiores"],
  ["coberturas_telhados", "Coberturas e Telhados"],
  ["impermeabilizacao_isolamento", "Impermeabilização e Isolamento"],
  ["instalacoes_aguas", "Instalações de Águas e Saneamento"],
  ["instalacoes_eletricas", "Instalações Elétricas"],
  ["rebocos_estuques", "Rebocos e Estuques"],
  ["tetos_falsos_pladur", "Tetos Falsos em Pladur"],
  ["pavimentos_revestimentos", "Pavimentos e Revestimentos Cerâmicos"],
  ["caixilharias_exteriores", "Caixilharias Exteriores de Alumínio"],
  ["carpintarias_interiores", "Carpintarias Interiores - Portas"],
  ["pinturas_cn", "Pinturas Interiores e Exteriores"],
  ["loucas_sanitarios", "Louças Sanitárias e Canalização"],
  ["arranjos_exteriores", "Arranjos Exteriores e Paisagismo"],

  // LSF
  ["lsf_preparacao_terras", "Movimento de Terras"],
  ["lsf_fundacao_laje", "Fundações e Laje em Betão"],
  ["lsf_estrutura", "Estrutura LSF em Aço Leve"],
  ["lsf_fecho_exterior", "Fechamento Exterior - Revestimento de Fachada"],
  ["lsf_divisorias", "Divisórias em Pladur / Gesso"],
  ["lsf_cobertura", "Cobertura - Telhados"],
  ["lsf_isolamentos", "Isolamento Térmico e Acústico"],
  ["lsf_fachada", "Revestimento de Fachada"],
  ["lsf_instalacoes_aguas", "Instalações Hidráulicas"],
  ["lsf_instalacoes_eletricas", "Instalações Elétricas"],
  ["lsf_rebocos_estuques", "Rebocos e Estuques"],
  ["lsf_tetos_falsos", "Tetos Falsos em Pladur"],
  ["lsf_pavimentos", "Pavimentos e Revestimentos"],
  ["lsf_caixilharias", "Caixilharias de Alumínio"],
  ["lsf_carpintarias", "Carpintarias - Portas Interiores"],
  ["lsf_pinturas", "Pinturas"],
  ["lsf_loucas_sanitarios", "Louças Sanitárias"],
  ["lsf_arranjos_exteriores", "Arranjos Exteriores"],

  // ICF
  ["icf_preparacao_terras", "Trabalhos Preparatórios e Estaleiro"],
  ["icf_fundacoes_laje", "Fundações e Laje em Betão"],
  ["icf_paredes_estruturais", "Paredes Estruturais ICF em Betão"],
  ["icf_lajes_cobertura", "Lajes de Cobertura em Betão"],
  ["icf_impermeabilizacao", "Impermeabilização"],
  ["icf_instalacoes_aguas", "Instalações Hidráulicas"],
  ["icf_instalacoes_eletricas", "Instalações Elétricas"],
  ["icf_revestimento_interior", "Revestimento Interior - Reboco"],
  ["icf_revestimento_exterior", "Revestimento Exterior de Fachada"],
  ["icf_tetos_falsos", "Tetos Falsos em Pladur"],
  ["icf_pavimentos", "Pavimentos e Revestimentos"],
  ["icf_caixilharias", "Caixilharias de Alumínio"],
  ["icf_carpintarias", "Carpintarias - Portas"],
  ["icf_pinturas", "Pinturas"],
  ["icf_loucas_sanitarios", "Louças Sanitárias e Canalização"],
  ["icf_arranjos_exteriores", "Arranjos Exteriores e Paisagismo"],
];

describe("Mapping areaKey -> capítulo (casos positivos)", () => {
  it.each(POSITIVE_CASES)(
    "area '%s' apanha capítulo '%s'",
    (area, capitulo) => {
      expect(matches(capitulo, area)).toBe(true);
    },
  );

  it("é case-insensitive", () => {
    expect(matches("PINTURAS E TINTAS", "pinturas")).toBe(true);
    expect(matches("pinturas e tintas", "pinturas")).toBe(true);
  });
});

/**
 * Casos negativos: capítulos que NÃO deviam aparecer numa dada área.
 * Garante que o filtro tem alguma especificidade (não é só um catch-all).
 */
const NEGATIVE_CASES: Array<[string, string]> = [
  ["pinturas", "Estrutura de Betão Armado"],
  ["eletrica", "Pinturas e Tintas"],
  ["carpintaria", "Movimento de Terras"],
  ["telhados", "Pavimentos cerâmicos"],
  ["cozinha", "Pinturas exteriores"],
  ["piscinas", "Pinturas interiores"],
  ["icf_paredes_estruturais", "Pinturas interiores"],
  ["lsf_estrutura", "Pinturas e Tintas"],
];

describe("Mapping areaKey -> capítulo (casos negativos)", () => {
  it.each(NEGATIVE_CASES)(
    "area '%s' NÃO apanha capítulo '%s'",
    (area, capitulo) => {
      expect(matches(capitulo, area)).toBe(false);
    },
  );
});
