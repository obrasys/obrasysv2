import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TenantSupplierInvite {
  id: string;
  email: string;
  nome_fornecedor: string | null;
  categoria: string | null;
  mensagem: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token: string;
  organization_id: string | null;
  fornecedor_id: string | null;
  invited_by_admin_user_id: string;
  expires_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface CreateInviteInput {
  email: string;
  nome_fornecedor?: string;
  categoria?: string;
  mensagem?: string;
  fornecedor_id?: string | null;
}

/**
 * Convites de fornecedor isolados por empresa.
 * RLS já garante que só vemos convites da nossa organização.
 */
export function useTenantSupplierInvites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tenant-supplier-invites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_invites')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any[]) as TenantSupplierInvite[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateTenantSupplierInvite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateInviteInput) => {
      if (!user?.id) throw new Error('Não autenticado');

      // Obter organization_id do utilizador
      const { data: org, error: orgErr } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (orgErr || !org) throw new Error('Sem organização associada');

      const { data, error } = await supabase
        .from('supplier_invites')
        .insert({
          email: input.email.trim().toLowerCase(),
          nome_fornecedor: input.nome_fornecedor?.trim() || null,
          categoria: input.categoria || null,
          mensagem: input.mensagem?.trim() || null,
          fornecedor_id: input.fornecedor_id || null,
          organization_id: org.organization_id,
          invited_by_admin_user_id: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;

      const { error: emailError } = await supabase.functions.invoke('send-supplier-invite', {
        body: { invite_id: (data as any).id },
      });
      if (emailError) console.error('send-supplier-invite error:', emailError);

      return data as unknown as TenantSupplierInvite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-supplier-invites'] });
      toast({
        title: 'Convite enviado',
        description: 'O fornecedor receberá um email com o link de acesso.',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao enviar convite',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCancelTenantSupplierInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.rpc('cancel_supplier_invite' as any, {
        _invite_id: inviteId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-supplier-invites'] });
      toast({ title: 'Convite cancelado' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });
}

export function useResendTenantSupplierInvite() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.functions.invoke('send-supplier-invite', {
        body: { invite_id: inviteId },
      });
      if (error) throw error;
    },
    onSuccess: () => toast({ title: 'Email reenviado' }),
    onError: (err: Error) =>
      toast({ title: 'Erro ao reenviar', description: err.message, variant: 'destructive' }),
  });
}

export interface InviteLookup {
  id: string;
  email: string;
  nome_fornecedor: string | null;
  categoria: string | null;
  mensagem: string | null;
  status: string;
  expires_at: string;
  organization_id: string | null;
  organization_name: string | null;
}

export function useInviteLookup(token: string | null) {
  return useQuery({
    queryKey: ['supplier-invite-lookup', token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase.rpc('lookup_supplier_invite' as any, {
        _token: token,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as InviteLookup) || null;
    },
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptSupplierInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc('accept_supplier_invite' as any, {
        _token: token,
      });
      if (error) throw error;
      return data as { link_id: string; organization_id: string; invite_id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: 'Convite aceite',
        description: 'Já tem acesso aos pedidos desta empresa.',
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao aceitar', description: err.message, variant: 'destructive' });
    },
  });
}
