import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type {
  IcfAssistantItem,
  IcfAssistantSession,
  IcfPlanKind,
} from '@/types/icf-assistant';
import { suggestFoundationItems, type FoundationSuggestionInput } from '@/lib/icf-foundation-suggestions';

const TABLE_SESSIONS = 'icf_assistant_sessions' as const;
const TABLE_ITEMS = 'icf_assistant_items' as const;

export function useIcfAssistantSessions(obraId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['icf-assistant-sessions', obraId ?? 'all'],
    enabled: !!user,
    queryFn: async () => {
      let q = (supabase.from(TABLE_SESSIONS as any) as any).select('*').order('created_at', { ascending: false });
      if (obraId) q = q.eq('obra_id', obraId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as IcfAssistantSession[];
    },
  });
}

export function useIcfAssistantSession(sessionId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['icf-assistant-session', sessionId],
    enabled: !!user && !!sessionId,
    queryFn: async () => {
      const { data, error } = await (supabase.from(TABLE_SESSIONS as any) as any)
        .select('*')
        .eq('id', sessionId)
        .single();
      if (error) throw error;
      return data as IcfAssistantSession;
    },
  });
}

export function useIcfAssistantItems(sessionId?: string) {
  return useQuery({
    queryKey: ['icf-assistant-items', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await (supabase.from(TABLE_ITEMS as any) as any)
        .select('*')
        .eq('session_id', sessionId)
        .order('ordem');
      if (error) throw error;
      return (data ?? []) as IcfAssistantItem[];
    },
  });
}

export function useCreateAssistantSession() {
  const { user, organization } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: { obra_id?: string | null; plan_kind: IcfPlanKind; file_path?: string | null }) => {
      if (!user || !organization) throw new Error('Sessão inválida');
      const { data, error } = await (supabase.from(TABLE_SESSIONS as any) as any)
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          obra_id: payload.obra_id ?? null,
          plan_kind: payload.plan_kind,
          file_path: payload.file_path ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as IcfAssistantSession;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icf-assistant-sessions'] }),
    onError: (e: any) => toast({ title: 'Erro ao criar sessão', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateAssistantSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; patch: Partial<IcfAssistantSession> }) => {
      const { data, error } = await (supabase.from(TABLE_SESSIONS as any) as any)
        .update(payload.patch as any)
        .eq('id', payload.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['icf-assistant-session', vars.id] });
      qc.invalidateQueries({ queryKey: ['icf-assistant-sessions'] });
    },
  });
}

export function useUpdateAssistantItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; patch: Partial<IcfAssistantItem> }) => {
      const { data, error } = await (supabase.from(TABLE_ITEMS as any) as any)
        .update(payload.patch as any)
        .eq('id', payload.id)
        .select()
        .single();
      if (error) throw error;
      return data as IcfAssistantItem;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ['icf-assistant-items', d.session_id] }),
  });
}

export function useApplyFoundationSuggestion(sessionId: string) {
  const { organization } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: FoundationSuggestionInput) => {
      if (!organization) throw new Error('Organização ausente');
      // Remover sugestões anteriores
      await (supabase.from(TABLE_ITEMS as any) as any)
        .delete()
        .eq('session_id', sessionId)
        .eq('category', 'fundacao')
        .eq('source_type', 'sugerido_axia');
      const items = suggestFoundationItems(input);
      if (items.length === 0) return [];
      const rows = items.map((it) => ({
        ...it,
        session_id: sessionId,
        organization_id: organization.id,
        assumptions: it.assumptions as any,
        attributes: it.attributes as any,
      }));
      const { data, error } = await (supabase.from(TABLE_ITEMS as any) as any).insert(rows as any).select();
      if (error) throw error;
      await (supabase.from(TABLE_SESSIONS as any) as any)
        .update({
          foundation_option: input.option,
          foundation_params: input.params as any,
          foundations_found: false,
        })
        .eq('id', sessionId);
      return data as IcfAssistantItem[];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['icf-assistant-items', sessionId] });
      qc.invalidateQueries({ queryKey: ['icf-assistant-session', sessionId] });
      toast({ title: 'Sugestão aplicada', description: 'Itens preliminares de fundação criados - requerem revisão técnica.' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
