/**
 * Fase 11 — Catálogo central de mensagens ao utilizador para o
 * módulo Planta/ICF (PDF + DXF).
 *
 * Regras:
 *   - Em português europeu, curto, sem jargão.
 *   - Sem códigos técnicos voltados ao programador.
 *   - Tom calmo (Axia™ é assistente, não alarme).
 *   - Não revela PII, paths internos, nem detalhes do modelo.
 *
 * `humanizeError()` recebe qualquer Error/string e devolve uma
 * mensagem amigável tentando mapear padrões conhecidos.
 */

export interface UserMessage {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

/** Mensagens nomeadas (chave estável para reutilização). */
export const PLAN_MESSAGES = {
  // Upload
  upload_error: (detail?: string): UserMessage => ({
    title: "Não consegui carregar o ficheiro",
    description:
      detail ||
      "Verifique o tamanho (até 12 MB raster / 20 MB DXF) e o formato (PDF, PNG, JPG ou DXF).",
    variant: "destructive",
  }),
  upload_invalid_format: (): UserMessage => ({
    title: "Formato não suportado",
    description:
      "A Axia lê PDF, PNG, JPG (raster) e DXF (vetorial). Outros formatos não estão disponíveis.",
    variant: "destructive",
  }),

  // Análise
  analysis_started: (): UserMessage => ({
    title: "A analisar a planta",
    description: "Pode demorar até 30 segundos para PDFs com muitos pisos.",
  }),
  analysis_done: (counts: { paredes: number; fundacoes: number; lajes: number }): UserMessage => ({
    title: "Análise concluída",
    description: `Encontrados ${counts.paredes} paredes, ${counts.fundacoes} fundações e ${counts.lajes} lajes.`,
  }),
  analysis_needs_review: (): UserMessage => ({
    title: "Revisão humana recomendada",
    description:
      "Detetei medidas com baixa confiança ou possíveis duplicações. Reveja antes de avançar para orçamento.",
    variant: "destructive",
  }),
  analysis_error: (detail?: string): UserMessage => ({
    title: "Não consegui analisar a planta",
    description: detail || "Tente novamente em alguns segundos. Se persistir, contacte o suporte.",
    variant: "destructive",
  }),

  // Escala / unidade DXF
  scale_missing: (): UserMessage => ({
    title: "Escala não detetada",
    description: "Confirme manualmente a unidade do desenho antes de continuar.",
    variant: "destructive",
  }),
  unit_assumed: (unit: string): UserMessage => ({
    title: `Unidade assumida: ${unit}`,
    description: "O ficheiro não declarava a unidade — confirme que está correta.",
  }),

  // Dados em falta
  missing_data_applied: (): UserMessage => ({
    title: "Valores aplicados com revisão obrigatória",
    description: "As paredes afetadas ficam marcadas como “requer revisão” antes de irem para orçamento.",
  }),
  rasterized_pdf: (): UserMessage => ({
    title: "PDF rasterizado",
    description:
      "Este PDF é uma imagem digitalizada, sem texto vetorial. A leitura é menos precisa — reveja as medidas.",
  }),
  low_confidence: (pct: number): UserMessage => ({
    title: `Confiança média ${Math.round(pct * 100)}%`,
    description: "Abaixo do mínimo recomendado (85%). Edite ou valide manualmente cada parede.",
  }),

  // Revisão
  review_saved_full: (n: number): UserMessage => ({
    title: "Revisão guardada",
    description: `${n} parede(s) validadas. Pode prosseguir para o orçamento.`,
  }),
  review_saved_partial: (pendentes: number): UserMessage => ({
    title: "Revisão guardada (parcial)",
    description: `Ainda há ${pendentes} parede(s) marcadas para rever.`,
  }),
  review_save_error: (detail?: string): UserMessage => ({
    title: "Não consegui guardar a revisão",
    description: detail || "Tente novamente. Se persistir, contacte o suporte.",
    variant: "destructive",
  }),

  // Persistência / orçamento
  records_created: (counts: { paredes: number; fundacoes: number; lajes: number }): UserMessage => ({
    title: "Dados ICF criados",
    description: `${counts.paredes} paredes, ${counts.fundacoes} fundações e ${counts.lajes} lajes adicionadas à configuração.`,
  }),
  records_error: (detail?: string): UserMessage => ({
    title: "Não consegui criar os registos ICF",
    description: detail || "Verifique a configuração ICF associada e tente novamente.",
    variant: "destructive",
  }),
  budget_blocked: (): UserMessage => ({
    title: "Envio bloqueado",
    description: "Resolva os avisos críticos no painel de quantitativos antes de enviar para orçamento.",
    variant: "destructive",
  }),

  // Genéricos
  org_missing: (): UserMessage => ({
    title: "Organização não encontrada",
    description: "Faça login novamente — não consegui identificar a sua empresa ativa.",
    variant: "destructive",
  }),
} as const;

const ERROR_PATTERNS: Array<{ rx: RegExp; build: (raw: string) => UserMessage }> = [
  { rx: /file too large|payload too large|413/i, build: () => PLAN_MESSAGES.upload_error("O ficheiro é demasiado grande. Limite: 12 MB raster / 20 MB DXF.") },
  { rx: /unsupported|invalid mime|formato/i, build: () => PLAN_MESSAGES.upload_invalid_format() },
  { rx: /scale|escala|insunits/i, build: () => PLAN_MESSAGES.scale_missing() },
  { rx: /raster|imagem digitalizada/i, build: () => PLAN_MESSAGES.rasterized_pdf() },
  { rx: /timeout|timed out|deadline/i, build: () => PLAN_MESSAGES.analysis_error("A análise demorou demasiado. Tente um ficheiro mais pequeno ou divida em pisos.") },
  { rx: /jwt|unauthorized|401|403/i, build: () => PLAN_MESSAGES.org_missing() },
  { rx: /quota|rate limit|429/i, build: () => PLAN_MESSAGES.analysis_error("Atingimos o limite de pedidos. Tente novamente em 1 minuto.") },
];

/**
 * Recebe um erro qualquer e devolve uma `UserMessage` humana.
 * Usa o catálogo acima como fallback genérico.
 */
export function humanizeError(err: unknown, fallback?: UserMessage): UserMessage {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  const match = ERROR_PATTERNS.find((p) => p.rx.test(raw));
  if (match) return match.build(raw);
  if (fallback) {
    return {
      ...fallback,
      description: raw && raw.length < 200 ? raw : fallback.description,
    };
  }
  return PLAN_MESSAGES.analysis_error(raw && raw.length < 200 ? raw : undefined);
}
