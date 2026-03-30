/**
 * Plan feature definitions and limits for ObraSys subscription tiers.
 */

export interface PlanLimits {
  maxObrasAtivas: number; // 0 = unlimited
  maxUtilizadores: number; // 0 = unlimited
  features: {
    controloOrcamentos: boolean;
    gestaoDocumentos: boolean;
    aplicacaoMovel: boolean;
    suporteEmail: boolean;
    gestaoEquipasAvancada: boolean;
    relatoriosPersonalizados: boolean;
    suportePrioritario: boolean;
    basePrecos: boolean;
    conformidade: boolean;
    gestaoFinanceira: boolean;
  };
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  trial: {
    maxObrasAtivas: 1,
    maxUtilizadores: 1,
    features: {
      controloOrcamentos: true,
      gestaoDocumentos: true,
      aplicacaoMovel: true,
      suporteEmail: true,
      gestaoEquipasAvancada: false,
      relatoriosPersonalizados: false,
      suportePrioritario: false,
      basePrecos: false,
      conformidade: false,
      gestaoFinanceira: false,
    },
  },
  starter: {
    maxObrasAtivas: 2,
    maxUtilizadores: 1,
    features: {
      controloOrcamentos: true,
      gestaoDocumentos: true,
      aplicacaoMovel: true,
      suporteEmail: true,
      gestaoEquipasAvancada: false,
      relatoriosPersonalizados: false,
      suportePrioritario: false,
      basePrecos: false,
      conformidade: false,
      gestaoFinanceira: false,
    },
  },
  professional: {
    maxObrasAtivas: 0, // unlimited
    maxUtilizadores: 10,
    features: {
      controloOrcamentos: true,
      gestaoDocumentos: true,
      aplicacaoMovel: true,
      suporteEmail: true,
      gestaoEquipasAvancada: true,
      relatoriosPersonalizados: true,
      suportePrioritario: true,
      basePrecos: true,
      conformidade: true,
      gestaoFinanceira: true,
    },
  },
  enterprise: {
    maxObrasAtivas: 0,
    maxUtilizadores: 0,
    features: {
      controloOrcamentos: true,
      gestaoDocumentos: true,
      aplicacaoMovel: true,
      suporteEmail: true,
      gestaoEquipasAvancada: true,
      relatoriosPersonalizados: true,
      suportePrioritario: true,
      basePrecos: true,
      conformidade: true,
      gestaoFinanceira: true,
    },
  },
  founder: {
    maxObrasAtivas: 0,
    maxUtilizadores: 0,
    features: {
      controloOrcamentos: true,
      gestaoDocumentos: true,
      aplicacaoMovel: true,
      suporteEmail: true,
      gestaoEquipasAvancada: true,
      relatoriosPersonalizados: true,
      suportePrioritario: true,
      basePrecos: true,
      conformidade: true,
      gestaoFinanceira: true,
    },
  },
};

export type PlanFeature = keyof PlanLimits['features'];

export const PLAN_FEATURE_LABELS: Record<PlanFeature, string> = {
  controloOrcamentos: 'Controlo de orçamentos',
  gestaoDocumentos: 'Gestão de documentos',
  aplicacaoMovel: 'Aplicação móvel',
  suporteEmail: 'Suporte por email',
  gestaoEquipasAvancada: 'Gestão de equipas avançada',
  relatoriosPersonalizados: 'Relatórios personalizados',
  suportePrioritario: 'Suporte prioritário',
  basePrecos: 'Base de preços avançada',
  conformidade: 'Controlo de conformidade',
  gestaoFinanceira: 'Gestão financeira completa',
};
