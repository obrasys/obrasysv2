import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Building2, FileText, Users, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import React from 'react';
import type { ChecklistStep } from '@/components/onboarding/OnboardingProgressPanel';

interface OnboardingProgress {
  id: string;
  user_id: string;
  first_login_done: boolean;
  step_1_completed: boolean;
  step_2_completed: boolean;
  step_3_completed: boolean;
  step_4_completed: boolean;
  onboarding_dismissed: boolean;
  completed_at: string | null;
  created_at: string;
  wizard_status: string;
  wizard_current_step: number;
  selected_goal: string | null;
  selected_role: string | null;
}

type WizardStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

const STEP_WEIGHTS = { obra: 40, orcamento: 25, equipa: 15, rdo: 20 };

const GOAL_PRIORITY: Record<string, string[]> = {
  organizar_obra: ['obra', 'orcamento', 'equipa', 'rdo'],
  criar_orcamento: ['orcamento', 'obra', 'equipa', 'rdo'],
  acompanhar_execucao: ['obra', 'rdo', 'orcamento', 'equipa'],
  centralizar_equipa: ['obra', 'equipa', 'orcamento', 'rdo'],
};

function buildSteps(
  progress: OnboardingProgress | null,
  goal: string | null,
): ChecklistStep[] {
  const base: ChecklistStep[] = [
    {
      key: 'obra',
      icon: React.createElement(Building2, { className: 'w-5 h-5' }),
      title: 'Criar a primeira obra',
      benefit: 'Centralize tudo da obra num único lugar',
      ctaLabel: 'Abrir obra',
      route: '/obras/criar',
      completed: progress?.step_1_completed ?? false,
      weight: STEP_WEIGHTS.obra,
    },
    {
      key: 'orcamento',
      icon: React.createElement(FileText, { className: 'w-5 h-5' }),
      title: 'Montar a base do orçamento',
      benefit: 'Ganhe controlo financeiro desde o início',
      ctaLabel: 'Criar orçamento',
      route: '/orcamentos/essencial/novo',
      completed: progress?.step_2_completed ?? false,
      weight: STEP_WEIGHTS.orcamento,
    },
    {
      key: 'equipa',
      icon: React.createElement(Users, { className: 'w-5 h-5' }),
      title: 'Adicionar equipa',
      benefit: 'Traga a equipa para dentro da operação',
      ctaLabel: 'Adicionar equipa',
      route: '/recursos',
      completed: progress?.step_3_completed ?? false,
      weight: STEP_WEIGHTS.equipa,
    },
    {
      key: 'rdo',
      icon: React.createElement(ClipboardList, { className: 'w-5 h-5' }),
      title: 'Registar primeiro progresso',
      benefit: 'Comece a acompanhar a execução com registos reais',
      ctaLabel: 'Registar progresso',
      route: '/rdos/criar',
      completed: progress?.step_4_completed ?? false,
      weight: STEP_WEIGHTS.rdo,
    },
  ];

  const priority = goal && GOAL_PRIORITY[goal] ? GOAL_PRIORITY[goal] : ['obra', 'orcamento', 'equipa', 'rdo'];
  return base.sort((a, b) => priority.indexOf(a.key) - priority.indexOf(b.key));
}

export function useOnboarding() {
  const { user } = useAuth();
  const location = useLocation();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const prevPercentage = useRef<number>(0);

  const syncAndFetch = useCallback(async () => {
    if (!user?.id) return;
    try {
      await supabase.rpc('sync_onboarding_progress', { p_user_id: user.id });
      const { data } = await supabase
        .from('user_onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) setProgress(data as unknown as OnboardingProgress);
    } catch (err) {
      console.error('Error syncing onboarding:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { syncAndFetch(); }, [syncAndFetch, location.pathname]);

  useEffect(() => {
    const handleFocus = () => syncAndFetch();
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => { if (document.visibilityState === 'visible') syncAndFetch(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [syncAndFetch]);

  // Weighted percentage
  const percentage = useMemo(() => {
    if (!progress) return 0;
    let total = 0;
    if (progress.step_1_completed) total += STEP_WEIGHTS.obra;
    if (progress.step_2_completed) total += STEP_WEIGHTS.orcamento;
    if (progress.step_3_completed) total += STEP_WEIGHTS.equipa;
    if (progress.step_4_completed) total += STEP_WEIGHTS.rdo;
    return total;
  }, [progress]);

  // Completion detection
  useEffect(() => {
    if (percentage === 100 && prevPercentage.current > 0 && prevPercentage.current < 100) {
      setShowCompletionModal(true);
    }
    prevPercentage.current = percentage;
  }, [percentage]);

  const wizardStatus: WizardStatus = (progress?.wizard_status as WizardStatus) || 'not_started';

  const showWizard = progress !== null && wizardStatus !== 'completed' && wizardStatus !== 'skipped';

  // Min activation = obra + at least 1 other
  const isMinActivation = progress !== null
    && progress.step_1_completed
    && (progress.step_2_completed || progress.step_3_completed || progress.step_4_completed);

  const showProgressPanel = progress !== null
    && !showWizard
    && !progress.onboarding_dismissed
    && !isMinActivation;

  const showSuccessState = progress !== null
    && !showWizard
    && !progress.onboarding_dismissed
    && isMinActivation
    && percentage < 100;

  const orderedSteps = useMemo(
    () => buildSteps(progress, progress?.selected_goal ?? null),
    [progress],
  );

  // --- Actions ---
  const updateWizardStep = useCallback(async (step: number, data?: Record<string, string>) => {
    if (!user?.id) return;
    const update: Record<string, unknown> = {
      wizard_current_step: step,
      wizard_status: 'in_progress',
      first_login_done: true,
    };
    if (data) Object.assign(update, data);
    await supabase.from('user_onboarding_progress').update(update).eq('user_id', user.id);
    setProgress((p) => p ? { ...p, ...update } as OnboardingProgress : p);
  }, [user?.id]);

  const completeWizard = useCallback(async () => {
    if (!user?.id) return;
    await supabase.from('user_onboarding_progress').update({
      wizard_status: 'completed',
      first_login_done: true,
    }).eq('user_id', user.id);
    setProgress((p) => p ? { ...p, wizard_status: 'completed', first_login_done: true } : p);
    syncAndFetch();
  }, [user?.id, syncAndFetch]);

  const skipWizard = useCallback(async () => {
    if (!user?.id) return;
    await supabase.from('user_onboarding_progress').update({
      wizard_status: 'skipped',
      first_login_done: true,
    }).eq('user_id', user.id);
    setProgress((p) => p ? { ...p, wizard_status: 'skipped', first_login_done: true } : p);
  }, [user?.id]);

  const dismissPanel = useCallback(async () => {
    if (!user?.id) return;
    await supabase.from('user_onboarding_progress').update({ onboarding_dismissed: true }).eq('user_id', user.id);
    setProgress((p) => p ? { ...p, onboarding_dismissed: true } : p);
  }, [user?.id]);

  return {
    progress,
    loading,
    wizardStatus,
    showWizard,
    showProgressPanel,
    showSuccessState,
    showCompletionModal,
    setShowCompletionModal,
    percentage,
    orderedSteps,
    updateWizardStep,
    completeWizard,
    skipWizard,
    dismissPanel,
    refreshProgress: syncAndFetch,
  };
}
