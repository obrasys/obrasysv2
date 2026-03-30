import { useCallback, useMemo } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useObras } from '@/hooks/useObras';
import { PLAN_LIMITS, type PlanFeature } from '@/config/planLimits';

export function useFeatureGate() {
  const { subscription } = useSubscription();
  const { obras } = useObras();

  const tier = subscription?.subscription_tier || 'trial';
  const limits = useMemo(() => PLAN_LIMITS[tier] || PLAN_LIMITS.trial, [tier]);

  const hasFeature = useCallback(
    (feature: PlanFeature): boolean => {
      return limits.features[feature] ?? false;
    },
    [limits]
  );

  const canCreateObra = useMemo(() => {
    if (limits.maxObrasAtivas === 0) return true; // unlimited
    const activeObras = obras?.filter(
      (o) => o.status !== 'concluida'
    )?.length || 0;
    return activeObras < limits.maxObrasAtivas;
  }, [limits.maxObrasAtivas, obras]);

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
