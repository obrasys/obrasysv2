/**
 * Configuração centralizada dos planos comerciais do Obra Sys.
 * Usado em: página pública de planos, seleção pós-trial, billing interno,
 * componentes de upgrade, mensagens de bloqueio e checkout.
 *
 * IMPORTANTE: Não duplicar textos de planos noutros sítios. Importar daqui.
 */

export type PlanKey = "starter" | "professional" | "promotor";

export interface PlanLimitsConfig {
  /** null = ilimitado */
  maxActiveProjects: number | null;
  includedUsers: number;
  unlimitedProjects: boolean;
}

/**
 * NOTA: O gate de funcionalidades em runtime vive em `src/config/planLimits.ts`
 * (consumido por `useFeatureGate`). Este ficheiro detém apenas a configuração
 * comercial — preços, copy de marketing, IDs Stripe e limites apresentados.
 * Mantém os dois ficheiros coerentes ao alterar qualquer plano.
 */

export interface PlanConfig {
  key: PlanKey;
  name: string;
  description: string;
  price: number;
  currency: "EUR";
  vatLabel: string;
  billingPeriod: "monthly";
  ctaLabel: string;
  badge?: string;
  features: string[];
  limits: PlanLimitsConfig;
  /** Nome da env var no edge function que contém o price_id Stripe */
  stripePriceEnvKey: string;
  /** Stripe Price ID (fallback / fonte para o frontend) */
  stripePriceId: string;
  /** Stripe Product ID para mapping no webhook / check-subscription */
  stripeProductId: string;
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  starter: {
    key: "starter",
    name: "Starter",
    description:
      "Para equipas pequenas que querem começar a organizar obras e documentos.",
    price: 29,
    currency: "EUR",
    vatLabel: "+ IVA",
    billingPeriod: "monthly",
    ctaLabel: "Começar com Starter",
    features: [
      "Até 2 obras ativas",
      "1 utilizador incluído",
      "Controlo de orçamentos",
      "Gestão de documentos",
      "Suporte por email",
    ],
    limits: {
      maxActiveProjects: 2,
      includedUsers: 1,
      unlimitedProjects: false,
    },
    stripePriceEnvKey: "STRIPE_PRICE_STARTER_MONTHLY",
    stripePriceId: "price_1Tk3JHP3LW226r1jImkBoYqd",
    stripeProductId: "prod_UjWLBCby5zhLab",
  },
  professional: {
    key: "professional",
    name: "Professional",
    description:
      "Para empresas que precisam controlar várias obras com mais equipa, relatórios e orçamentação.",
    price: 99,
    currency: "EUR",
    vatLabel: "+ IVA",
    billingPeriod: "monthly",
    ctaLabel: "Começar com Professional",
    badge: "Mais escolhido",
    features: [
      "Tudo do plano Starter",
      "Obras ilimitadas",
      "5 utilizadores incluídos",
      "Gestão de equipas avançada",
      "Relatórios personalizados",
      "Módulo Orçamentação com a Planta",
      "Suporte prioritário",
    ],
    limits: {
      maxActiveProjects: null,
      includedUsers: 5,
      unlimitedProjects: true,
    },
    stripePriceEnvKey: "STRIPE_PRICE_PROFESSIONAL_MONTHLY",
    stripePriceId: "price_1Tk3KCP3LW226r1jBsSOXD3x",
    stripeProductId: "prod_UjWMbiGskJiQ9H",
  },
  promotor: {
    key: "promotor",
    name: "Promotor",
    description:
      "Para promotores, construtoras e empresas que precisam de controlo avançado da obra, margem e fecho financeiro.",
    price: 179,
    currency: "EUR",
    vatLabel: "+ IVA",
    billingPeriod: "monthly",
    ctaLabel: "Começar com Promotor",
    features: [
      "Tudo do plano Professional",
      "10 utilizadores incluídos",
      "Módulo Avançado de Orçamentos",
      "Folha de Fecho",
      "Gestão da Obra Avançada",
      "Mapa de Comparativos",
      "Budget da Obra",
      "Forecast / EAC",
      "Controlo de Margem",
      "Gestão Documental Avançada",
      "Relatórios Executivos",
      "Suporte prioritário",
    ],
    limits: {
      maxActiveProjects: null,
      includedUsers: 10,
      unlimitedProjects: true,
    },
    stripePriceEnvKey: "STRIPE_PRICE_PROMOTOR_MONTHLY",
    stripePriceId: "price_1Tk3KfP3LW226r1jOuGpvcfe",
    stripeProductId: "prod_UjWNwEfMO2UegY",
  },
};

export const PLAN_ORDER: PlanKey[] = ["starter", "professional", "promotor"];

export function getPlan(key: PlanKey): PlanConfig {
  return PLANS[key];
}

export function formatPlanPrice(plan: PlanConfig): string {
  return `${plan.price}€ ${plan.vatLabel} / mês`;
}

/** Devolve o próximo plano superior, ou null se já é o topo. */
export function getNextPlan(current: PlanKey): PlanConfig | null {
  const idx = PLAN_ORDER.indexOf(current);
  if (idx < 0 || idx >= PLAN_ORDER.length - 1) return null;
  return PLANS[PLAN_ORDER[idx + 1]];
}

/** Mensagens de bloqueio amigáveis (limites e upsell). */
export const PLAN_LIMIT_MESSAGES = {
  starterMaxProjects:
    "Atingiu o limite de 2 obras ativas do plano Starter. Para continuar a criar obras, atualize para o plano Professional.",
  starterPlantBudgeting:
    "O Módulo Orçamentação com a Planta está disponível a partir do plano Professional.",
  professionalAdvancedFeature:
    "Esta funcionalidade está disponível no plano Promotor, indicado para empresas que precisam de controlo avançado da obra, margem e fecho financeiro.",
  userLimitReached:
    "Atingiu o limite de utilizadores incluídos no seu plano. Atualize o plano para adicionar mais membros à equipa.",
} as const;
