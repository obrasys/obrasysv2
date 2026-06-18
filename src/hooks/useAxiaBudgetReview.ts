import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ReviewItemType =
  | 'missing_price'
  | 'suspect_quantity'
  | 'ambiguous_unit'
  | 'doc_mismatch'
  | 'human_question'
  | 'missing_chapter'
  | 'other';

export type ReviewSeverity = 'info' | 'warning' | 'critical';
export type ReviewStatus = 'pending' | 'accepted' | 'rejected' | 'modified' | 'dismissed';

export interface AxiaBudgetReviewItem {
  id: string;
  organization_id: string;
  orcamento_id: string | null;
  budget_version_id: string | null;
  artigo_id: string | null;
  capitulo_id: string | null;
  item_type: ReviewItemType;
  severity: ReviewSeverity;
  status: ReviewStatus;
  title: string;
  description: string | null;
  axia_suggestion: any;
  original_value: any;
  user_action: any;
  source_document_id: string | null;
  source_page: number | null;
  source_line: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UseAxiaBudgetReviewParams {
  orcamentoId?: string | null;
  budgetVersionId?: string | null;
  enabled?: boolean;
}

export function useAxiaBudgetReview({
  orcamentoId,
  budgetVersionId,
  enabled = true,
}: UseAxiaBudgetReviewParams) {
  const qc = useQueryClient();
  const key = ['axia-budget-review', { orcamentoId, budgetVersionId }];

  const query = useQuery({
    queryKey: key,
    enabled: enabled && Boolean(orcamentoId || budgetVersionId),
    queryFn: async () => {
      let q = supabase
        .from('axia_budget_review_items')
        .select('*')
        .order('severity', { ascending: false })
        .order('created_at', { ascending: true });
      if (orcamentoId) q = q.eq('orcamento_id', orcamentoId);
      if (budgetVersionId) q = q.eq('budget_version_id', budgetVersionId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AxiaBudgetReviewItem[];
    },
  });

  const resolveItem = useMutation({
    mutationFn: async (input: {
      id: string;
      status: ReviewStatus;
      userAction?: any;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('axia_budget_review_items')
        .update({
          status: input.status,
          user_action: input.userAction ?? null,
          resolved_by: auth.user?.id ?? null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast.error(e.message ?? 'Erro ao atualizar item'),
  });

  const items = query.data ?? [];
  const pendingCritical = items.filter(
    (i) => i.severity === 'critical' && i.status === 'pending',
  );
  const pendingTotal = items.filter((i) => i.status === 'pending').length;
  const canProceed = pendingCritical.length === 0;

  return {
    items,
    isLoading: query.isLoading,
    pendingCritical,
    pendingTotal,
    canProceed,
    resolveItem,
    refetch: query.refetch,
  };
}
