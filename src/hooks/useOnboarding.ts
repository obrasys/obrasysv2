import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
}

export function useOnboarding() {
  const { user } = useAuth();
  const location = useLocation();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const prevPercentage = useRef<number>(0);

  const percentage = progress
    ? ([progress.step_1_completed, progress.step_2_completed, progress.step_3_completed, progress.step_4_completed]
        .filter(Boolean).length / 4) * 100
    : 0;

  const syncAndFetch = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Call sync function
      await supabase.rpc('sync_onboarding_progress', { p_user_id: user.id });
      
      // Fetch updated progress
      const { data } = await supabase
        .from('user_onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProgress(data as unknown as OnboardingProgress);
      }
    } catch (err) {
      console.error('Error syncing onboarding:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Re-sync on mount and on route change (e.g. after adding a team member in /recursos)
  useEffect(() => {
    syncAndFetch();
  }, [syncAndFetch, location.pathname]);

  // Re-sync when window regains focus (e.g. after navigating to /recursos and back)
  useEffect(() => {
    const handleFocus = () => { syncAndFetch(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') syncAndFetch();
    });
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [syncAndFetch]);

  // Detect completion transition (was <100%, now 100%)
  useEffect(() => {
    if (percentage === 100 && prevPercentage.current > 0 && prevPercentage.current < 100) {
      setShowCompletionModal(true);
    }
    prevPercentage.current = percentage;
  }, [percentage]);

  const dismissWelcome = useCallback(async (alsoDissmissChecklist = false) => {
    if (!user?.id) return;
    const update: Record<string, boolean> = { first_login_done: true };
    if (alsoDissmissChecklist) update.onboarding_dismissed = true;
    
    await supabase
      .from('user_onboarding_progress')
      .update(update)
      .eq('user_id', user.id);
    
    setProgress(prev => prev ? { ...prev, first_login_done: true, ...(alsoDissmissChecklist ? { onboarding_dismissed: true } : {}) } : prev);
  }, [user?.id]);

  const dismissOnboarding = useCallback(async () => {
    if (!user?.id) return;
    await supabase
      .from('user_onboarding_progress')
      .update({ onboarding_dismissed: true })
      .eq('user_id', user.id);
    setProgress(prev => prev ? { ...prev, onboarding_dismissed: true } : prev);
  }, [user?.id]);

  const showWelcomeModal = progress !== null && !progress.first_login_done;
  const showChecklist = progress !== null && progress.first_login_done && !progress.onboarding_dismissed && percentage < 100;
  
  // Inactive reminder: account created >24h ago and no obra
  const showInactiveReminder = progress !== null 
    && progress.first_login_done 
    && !progress.step_1_completed
    && !progress.onboarding_dismissed
    && progress.created_at
    && (Date.now() - new Date(progress.created_at).getTime()) > 24 * 60 * 60 * 1000;

  return {
    progress,
    loading,
    percentage,
    showWelcomeModal,
    showChecklist,
    showCompletionModal,
    setShowCompletionModal,
    showInactiveReminder,
    dismissWelcome,
    dismissOnboarding,
    refreshProgress: syncAndFetch,
  };
}
