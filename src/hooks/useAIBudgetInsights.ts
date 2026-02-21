import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AIBudgetInsight {
  id: string;
  user_id: string;
  budget_id: string;
  type: 'missing_sections' | 'missing_items' | 'outlier_prices' | 'low_margin' | 'parametric_suggestion';
  severity: 'info' | 'warn' | 'critical';
  title: string;
  message: string;
  impact_value: number | null;
  impact_percent: number | null;
  payload: Record<string, any>;
  status: 'open' | 'applied' | 'dismissed';
  created_at: string;
  updated_at: string;
}

export interface CompanyAISettings {
  id: string;
  user_id: string;
  country: string;
  enabled: boolean;
  llm_enabled: boolean;
  min_margin_percent: number;
  outlier_zscore: number;
  param_profile_default: string;
  ruleset: Record<string, any>;
}

async function callBudgetAI(action: string, payload: Record<string, any> = {}) {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) throw new Error('Não autenticado');

  const { data, error } = await supabase.functions.invoke('budget-ai-engine', {
    body: { action, ...payload },
  });

  if (error) throw new Error(error.message || 'Erro na função');
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useAIBudgetInsights(budgetId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const insightsQuery = useQuery({
    queryKey: ['ai-budget-insights', budgetId],
    queryFn: async () => {
      if (!budgetId) return [];
      const data = await callBudgetAI('getInsights', { budgetId });
      return (data.insights || []) as AIBudgetInsight[];
    },
    enabled: !!budgetId && !!user?.id,
  });

  const analyzebudget = useMutation({
    mutationFn: async (id: string) => {
      return await callBudgetAI('runBudgetRules', { budgetId: id });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-budget-insights'] });
      queryClient.invalidateQueries({ queryKey: ['orcamento'] });
      const total = (data.insights || []).filter((i: AIBudgetInsight) => i.status === 'open').length;
      toast.success(`Análise concluída: ${total} sugestão(ões) encontrada(s)`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao analisar orçamento');
    },
  });

  const applyInsight = useMutation({
    mutationFn: async (insightId: string) => {
      return await callBudgetAI('applyInsight', { insightId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-budget-insights'] });
      queryClient.invalidateQueries({ queryKey: ['orcamento'] });
      toast.success('Sugestão aplicada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao aplicar sugestão');
    },
  });

  const dismissInsight = useMutation({
    mutationFn: async (insightId: string) => {
      return await callBudgetAI('dismissInsight', { insightId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-budget-insights'] });
      toast.success('Sugestão ignorada');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao ignorar sugestão');
    },
  });

  // Computed counts
  const openInsights = (insightsQuery.data || []).filter((i) => i.status === 'open');
  const counts = {
    missing: openInsights.filter((i) => i.type === 'missing_sections' || i.type === 'missing_items').length,
    outlier: openInsights.filter((i) => i.type === 'outlier_prices').length,
    margin: openInsights.filter((i) => i.type === 'low_margin').length,
    total: openInsights.length,
  };

  return {
    insights: insightsQuery.data || [],
    openInsights,
    counts,
    isLoading: insightsQuery.isLoading,
    analyzebudget,
    applyInsight,
    dismissInsight,
  };
}

export function useCompanyAISettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['company-ai-settings'],
    queryFn: async () => {
      return await callBudgetAI('getSettings') as CompanyAISettings;
    },
    enabled: !!user?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<CompanyAISettings>) => {
      return await callBudgetAI('updateSettings', { settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-ai-settings'] });
      toast.success('Definições de IA atualizadas');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar definições');
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    updateSettings,
  };
}
