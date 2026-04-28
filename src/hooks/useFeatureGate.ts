import { useCallback, useMemo } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useObras } from '@/hooks/useObras';
import { PLAN_LIMITS, type PlanFeature } from '@/config/planLimits';

// Planos vitalícios / ilimitados que nunca devem ver prompts de upgrade
const UNLIMITED_TIERS = new Set(['founder', 'enterprise']);

export function useFeatureGate() {
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { obras } = useObras();

  const tier = subscription?.subscription_tier || 'trial';
  const isUnlimited = UNLIMITED_TIERS.has(tier) || subscription?.is_founder === true;
  const limits = useMemo(() => PLAN_LIMITS[tier] || PLAN_LIMITS.trial, [tier]);

  const hasFeature = useCallback(
    (feature: PlanFeature): boolean => {
      if (isUnlimited) return true;
      return limits.features[feature] ?? false;
    },
    [limits, isUnlimited]
  );

  const canCreateObra = useMemo(() => {
    if (isUnlimited) return true;
    if (subscriptionLoading) return true; // não bloquear enquanto carrega
    if (limits.maxObrasAtivas === 0) return true; // unlimited
    const activeObras = obras?.filter(
      (o) => o.status !== 'concluida'
    )?.length || 0;
    return activeObras < limits.maxObrasAtivas;
  }, [limits.maxObrasAtivas, obras, isUnlimited, subscriptionLoading]);

  const obrasAtivas = useMemo(() => {
    return obras?.filter((o) => o.status !== 'concluida')?.length || 0;
  }, [obras]);

  const canInviteUser = useCallback(
    (currentMemberCount: number): boolean => {
      if (limits.maxUtilizadores === 0) return true; // unlimited
      return currentMemberCount < limits.maxUtilizadores;
    },
    [limits.maxUtilizadores]
  );

  const requiresUpgrade = useCallback(
    (feature: PlanFeature): string | null => {
      if (hasFeature(feature)) return null;
      if (tier === 'starter') return 'Professional';
      return 'Starter';
    },
    [hasFeature, tier]
  );

  return {
    tier,
    limits,
    hasFeature,
    canCreateObra,
    obrasAtivas,
    canInviteUser,
    requiresUpgrade,
  };
}
