import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { MceApproval, MceApprovalDecision } from '@/types/mce';

const QK = {
  approvals: (mceId: string) => ['mce', 'approvals', mceId] as const,
};

export function useMCEApprovals(mceId: string | undefined) {
  return useQuery({
    queryKey: QK.approvals(mceId ?? ''),
    enabled: !!mceId,
    queryFn: async (): Promise<MceApproval[]> => {
      const { data, error } = await supabase
        .from('mce_approvals')
        .select('*')
        .eq('mce_id', mceId!)
        .order('level_order');
      if (error) throw error;
      return (data ?? []) as MceApproval[];
    },
  });
}

export function useRequestMCEApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mceId: string) => {
      const { data, error } = await supabase.rpc('request_mce_approval', { _mce_id: mceId });
      if (error) throw error;
      return { mceId, result: data as { ok: boolean; errors?: string[] } };
    },
    onSuccess: ({ mceId, result }) => {
      qc.invalidateQueries({ queryKey: QK.approvals(mceId) });
      qc.invalidateQueries({ queryKey: ['mce', 'detail', mceId] });
      if (result.ok) {
        toast({ title: 'MCE enviado para aprovação' });
      } else {
        toast({
          title: 'Não é possível enviar',
          description: (result.errors ?? []).join(' • '),
          variant: 'destructive',
        });
      }
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDecideMCEApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      approval_id: string;
      mce_id: string;
      decision: MceApprovalDecision;
      comment?: string;
      validated_amount?: number;
      signature?: string;
    }) => {
      const { error } = await supabase.rpc('decide_mce_approval', {
        _approval_id: input.approval_id,
        _decision: input.decision,
        _comment: input.comment ?? null,
        _validated_amount: input.validated_amount ?? null,
        _signature: input.signature ?? null,
      });
      if (error) throw error;
      return input.mce_id;
    },
    onSuccess: (mceId) => {
      qc.invalidateQueries({ queryKey: QK.approvals(mceId) });
      qc.invalidateQueries({ queryKey: ['mce', 'detail', mceId] });
      toast({ title: 'Decisão registada' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
