import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type EngagementState = 'A' | 'B' | 'C' | 'D' | null;

interface EngagementStatus {
  has_created_project: boolean;
  has_created_budget: boolean;
  total_records_created: number;
  last_action_date: string | null;
  message_last_shown: string | null;
  message_dismissed_until: string | null;
}

export function useEngagement() {
  const { user } = useAuth();
  const [status, setStatus] = useState<EngagementStatus | null>(null);
  const [activeState, setActiveState] = useState<EngagementState>(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessageShown, setSessionMessageShown] = useState(false);

  // Refresh engagement data from DB function
  const refreshStatus = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Call the refresh function to sync real data
      await supabase.rpc('refresh_engagement_status', { p_user_id: user.id });
      
      // Fetch the updated status
      const { data, error } = await supabase
        .from('user_engagement_status')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching engagement status:', error);
        return;
      }

      setStatus(data as EngagementStatus);
    } catch (err) {
      console.error('Error refreshing engagement:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Determine active state based on rules
  useEffect(() => {
    if (!status || sessionMessageShown) {
      setActiveState(null);
      return;
    }

    // Check if dismissed
    if (status.message_dismissed_until) {
      const dismissedUntil = new Date(status.message_dismissed_until);
      if (dismissedUntil > new Date()) {
        setActiveState(null);
        return;
      }
    }

    // State A: No project created
    if (!status.has_created_project) {
      setActiveState('A');
      return;
    }

    // State B: Has project but no budget
    if (status.has_created_project && !status.has_created_budget) {
      setActiveState('B');
      return;
    }

    // State C: Has budget but < 3 records and inactive > 7 days
    if (status.has_created_budget && status.total_records_created < 3 && status.last_action_date) {
      const daysSinceAction = Math.floor(
        (Date.now() - new Date(status.last_action_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceAction > 7) {
        setActiveState('C');
        return;
      }
    }

    // State D: Active user (>= 3 records) - badge, always shown
    if (status.total_records_created >= 3) {
      setActiveState('D');
      return;
    }

    setActiveState(null);
  }, [status, sessionMessageShown]);

  // Refresh on mount
  useEffect(() => {
    if (user?.id) {
      refreshStatus();
    }
  }, [user?.id, refreshStatus]);

  // Dismiss message for 3 days
  const dismissMessage = useCallback(async () => {
    if (!user?.id) return;
    
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 3);
    
    await supabase
      .from('user_engagement_status')
      .update({
        message_dismissed_until: dismissUntil.toISOString(),
        message_last_shown: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    setSessionMessageShown(true);
    setActiveState(null);
  }, [user?.id]);

  // Mark message as shown (once per session)
  const markShown = useCallback(async () => {
    if (!user?.id) return;
    
    await supabase
      .from('user_engagement_status')
      .update({ message_last_shown: new Date().toISOString() })
      .eq('user_id', user.id);

    setSessionMessageShown(true);
  }, [user?.id]);

  return {
    status,
    activeState,
    loading,
    dismissMessage,
    markShown,
    refreshStatus,
  };
}
