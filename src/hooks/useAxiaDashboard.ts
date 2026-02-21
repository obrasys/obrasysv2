import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AxiaActionLog {
  id: string;
  action: string;
  budget_id: string;
  insight_id: string;
  created_at: string;
  before_snapshot: any;
  after_snapshot: any;
}

export interface AxiaDashboardData {
  score: number;
  totalInsights: number;
  openInsights: number;
  appliedInsights: number;
  dismissedInsights: number;
  criticalCount: number;
  warnCount: number;
  missingCount: number;
  outlierCount: number;
  marginCount: number;
  actionHistory: AxiaActionLog[];
}

function computeScore(data: { criticalCount: number; warnCount: number; missingCount: number; outlierCount: number; totalInsights: number; openInsights: number }): number {
  if (data.totalInsights === 0) return 100;
  
  const resolvedRatio = data.totalInsights > 0 ? (data.totalInsights - data.openInsights) / data.totalInsights : 1;
  const criticalPenalty = Math.min(data.criticalCount * 15, 40);
  const warnPenalty = Math.min(data.warnCount * 8, 30);
  const missingPenalty = Math.min(data.missingCount * 5, 30);

  const score = Math.round(100 * resolvedRatio - criticalPenalty - warnPenalty - missingPenalty);
  return Math.max(0, Math.min(100, score));
}

export function useAxiaDashboard() {
  const { user } = useAuth();

  const dashboardQuery = useQuery({
    queryKey: ['axia-dashboard', user?.id],
    queryFn: async (): Promise<AxiaDashboardData> => {
      // Fetch all insights
      const { data: insights, error: insErr } = await supabase
        .from('ai_budget_insights')
        .select('id, type, severity, status')
        .eq('user_id', user!.id);

      if (insErr) throw insErr;

      const all = insights || [];
      const open = all.filter(i => i.status === 'open');
      const applied = all.filter(i => i.status === 'applied');
      const dismissed = all.filter(i => i.status === 'dismissed');
      const critical = open.filter(i => i.severity === 'critical');
      const warn = open.filter(i => i.severity === 'warn');
      const missing = open.filter(i => i.type === 'missing_sections' || i.type === 'missing_items');
      const outlier = open.filter(i => i.type === 'outlier_prices');
      const margin = open.filter(i => i.type === 'low_margin');

      // Fetch action history
      const { data: actions, error: actErr } = await supabase
        .from('ai_budget_actions_log')
        .select('id, action, budget_id, insight_id, created_at, before_snapshot, after_snapshot')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (actErr) throw actErr;

      const counts = {
        criticalCount: critical.length,
        warnCount: warn.length,
        missingCount: missing.length,
        outlierCount: outlier.length,
        totalInsights: all.length,
        openInsights: open.length,
      };

      return {
        score: computeScore(counts),
        totalInsights: all.length,
        openInsights: open.length,
        appliedInsights: applied.length,
        dismissedInsights: dismissed.length,
        criticalCount: critical.length,
        warnCount: warn.length,
        missingCount: missing.length,
        outlierCount: outlier.length,
        marginCount: margin.length,
        actionHistory: (actions || []) as AxiaActionLog[],
      };
    },
    enabled: !!user?.id,
  });

  return {
    data: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
  };
}
