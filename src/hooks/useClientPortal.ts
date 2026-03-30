import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PortalEventType } from '@/types/portal';

export function useClientPortal() {
  const { user } = useAuth();

  const { data: obras, isLoading: obrasLoading } = useQuery({
    queryKey: ['client-obras', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // With RLS policies, clients can only see obras they have access to
      const { data, error } = await supabase
        .from('obras')
        .select('id, nome, endereco, status, progresso, data_inicio, data_fim, updated_at');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  return { obras, obrasLoading };
}

export function useClientObraDetail(obraId: string | undefined) {
  const { user } = useAuth();

  const { data: obra, isLoading: obraLoading } = useQuery({
    queryKey: ['client-obra', obraId],
    queryFn: async () => {
      if (!obraId) return null;
      const { data, error } = await supabase
        .from('obras')
        .select('id, nome, endereco, status, progresso, data_inicio, data_fim, updated_at')
        .eq('id', obraId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!obraId && !!user?.id,
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['client-progress', obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from('obra_progress_tracking')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!obraId && !!user?.id,
  });

  const { data: rdos, isLoading: rdosLoading } = useQuery({
    queryKey: ['client-rdos', obraId],
    queryFn: async () => {
      if (!obraId) return [];
      // RLS already filters to submetido/aprovado for clients
      const { data, error } = await supabase
        .from('relatorios_diarios')
        .select('id, obra_id, data, status, observacoes, condicoes_meteorologicas, fotos, created_at, updated_at')
        .eq('obra_id', obraId)
        .in('status', ['submetido', 'aprovado'])
        .order('data', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!obraId && !!user?.id,
  });

  const { data: activityLogs } = useQuery({
    queryKey: ['client-activity', obraId, user?.id],
    queryFn: async () => {
      if (!obraId || !user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('client_access_logs')
        .select('id, event_type, entity_type, entity_id, occurred_at')
        .eq('client_user_id', user.id)
        .eq('obra_id', obraId)
        .order('occurred_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        event_type: string;
        entity_type: string | null;
        entity_id: string | null;
        occurred_at: string;
      }>;
    },
    enabled: !!obraId && !!user?.id,
  });

  const logEvent = useMutation({
    mutationFn: async ({ eventType, entityType, entityId, metadata }: {
      eventType: PortalEventType;
      entityType?: string;
      entityId?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user?.id || !obraId) return;
      const { error } = await (supabase as any)
        .from('client_access_logs')
        .insert({
          client_user_id: user.id,
          obra_id: obraId,
          event_type: eventType,
          entity_type: entityType || null,
          entity_id: entityId || null,
          metadata: metadata || null,
        });
      if (error) console.error('Error logging event:', error);
    },
  });

  return {
    obra,
    obraLoading,
    progress,
    progressLoading,
    rdos,
    rdosLoading,
    activityLogs,
    logEvent,
  };
}
