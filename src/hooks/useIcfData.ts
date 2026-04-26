import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { IcfConfiguracao, IcfPanoParede, IcfVao, IcfFundacao, IcfLaje, IcfResumo } from '@/types/icf';

// ─── Configurações ───
export function useIcfConfiguracoes(obraId?: string) {
  return useQuery({
    queryKey: ['icf-configuracoes', obraId],
    queryFn: async () => {
      let q = supabase.from('icf_configuracoes').select('*').order('versao', { ascending: false });
      if (obraId) q = q.eq('obra_id', obraId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as IcfConfiguracao[];
    },
    enabled: !!obraId,
  });
}

export function useIcfConfiguracao(id?: string) {
  return useQuery({
    queryKey: ['icf-configuracao', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('icf_configuracoes').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as unknown as IcfConfiguracao;
    },
    enabled: !!id,
  });
}

export function useCreateIcfConfig() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: Partial<IcfConfiguracao>) => {
      const { data, error } = await supabase.from('icf_configuracoes').insert(values as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['icf-configuracoes', v.obra_id] });
      toast({ title: 'Configuração ICF criada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateIcfConfig() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<IcfConfiguracao> & { id: string }) => {
      const { error } = await supabase.from('icf_configuracoes').update(values as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['icf-configuracoes'] });
      qc.invalidateQueries({ queryKey: ['icf-configuracao'] });
      toast({ title: 'Configuração atualizada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteIcfConfig() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('icf_configuracoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['icf-configuracoes'] });
      toast({ title: 'Configuração eliminada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

// ─── Panos de Parede ───
export function useIcfPanos(configId?: string) {
  return useQuery({
    queryKey: ['icf-panos', configId],
    queryFn: async () => {
      const { data, error } = await supabase.from('icf_panos_parede').select('*').eq('configuracao_id', configId!).order('ordem');
      if (error) throw error;
      return data as unknown as IcfPanoParede[];
    },
    enabled: !!configId,
  });
}

export function useCreateIcfPano() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: Partial<IcfPanoParede>) => {
      const { data, error } = await supabase.from('icf_panos_parede').insert(values as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['icf-panos', v.configuracao_id] });
      toast({ title: 'Pano adicionado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateIcfPano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<IcfPanoParede> & { id: string }) => {
      const { error } = await supabase.from('icf_panos_parede').update(values as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icf-panos'] }),
  });
}

export function useDeleteIcfPano() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('icf_panos_parede').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['icf-panos'] });
      toast({ title: 'Pano eliminado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

// ─── Vãos ───
export function useIcfVaos(panoId?: string) {
  return useQuery({
    queryKey: ['icf-vaos', panoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('icf_vaos').select('*').eq('pano_id', panoId!);
      if (error) throw error;
      return data as unknown as IcfVao[];
    },
    enabled: !!panoId,
  });
}

export function useCreateIcfVao() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: Partial<IcfVao>) => {
      const { data, error } = await supabase.from('icf_vaos').insert(values as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['icf-vaos', v.pano_id] });
      qc.invalidateQueries({ queryKey: ['icf-panos'] });
      toast({ title: 'Vão adicionado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteIcfVao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('icf_vaos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['icf-vaos'] });
      qc.invalidateQueries({ queryKey: ['icf-panos'] });
    },
  });
}

// ─── Fundações ───
export function useIcfFundacoes(configId?: string) {
  return useQuery({
    queryKey: ['icf-fundacoes', configId],
    queryFn: async () => {
      const { data, error } = await supabase.from('icf_fundacoes').select('*').eq('configuracao_id', configId!);
      if (error) throw error;
      return data as unknown as IcfFundacao[];
    },
    enabled: !!configId,
  });
}

export function useCreateIcfFundacao() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: Partial<IcfFundacao>) => {
      const { data, error } = await supabase.from('icf_fundacoes').insert(values as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['icf-fundacoes', v.configuracao_id] });
      toast({ title: 'Fundação adicionada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateIcfFundacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<IcfFundacao> & { id: string }) => {
      const { error } = await supabase.from('icf_fundacoes').update(values as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icf-fundacoes'] }),
  });
}

export function useDeleteIcfFundacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('icf_fundacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icf-fundacoes'] }),
  });
}

// ─── Lajes ───
export function useIcfLajes(configId?: string) {
  return useQuery({
    queryKey: ['icf-lajes', configId],
    queryFn: async () => {
      const { data, error } = await supabase.from('icf_lajes').select('*').eq('configuracao_id', configId!);
      if (error) throw error;
      return data as unknown as IcfLaje[];
    },
    enabled: !!configId,
  });
}

export function useCreateIcfLaje() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: Partial<IcfLaje>) => {
      const { data, error } = await supabase.from('icf_lajes').insert(values as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['icf-lajes', v.configuracao_id] });
      toast({ title: 'Laje adicionada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateIcfLaje() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<IcfLaje> & { id: string }) => {
      const { error } = await supabase.from('icf_lajes').update(values as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icf-lajes'] }),
  });
}

export function useDeleteIcfLaje() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('icf_lajes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icf-lajes'] }),
  });
}

// ─── Resumo ───
export function useIcfResumo(configId?: string) {
  return useQuery({
    queryKey: ['icf-resumo', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('icf_resumo_obra' as any)
        .select('*')
        .eq('configuracao_id', configId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as IcfResumo | null;
    },
    enabled: !!configId,
    retry: 1,
  });
}

// ─── Audit ───
export function useIcfAuditLog(configId?: string) {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (entry: { evento: string; entidade_tipo: string; entidade_id?: string; dados_anteriores?: any; dados_novos?: any }) => {
      const { error } = await supabase.from('icf_audit_log').insert(entry as any);
      if (error) throw error;
    },
    onError: (e: any) => console.error('Audit log error:', e.message),
  });
}
