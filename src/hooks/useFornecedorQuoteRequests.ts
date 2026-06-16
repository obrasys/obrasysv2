import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface DirectQuoteItemInput {
  descricao: string;
  unidade?: string | null;
  quantidade: number;
  codigo?: string | null;
  capitulo?: string | null;
  artigo_orcamento_id?: string | null;
}

export interface CreateDirectQuoteInput {
  fornecedor_id: string;
  orcamento_id?: string | null;
  obra_id?: string | null;
  requested_deadline?: string | null;
  message_to_suppliers?: string | null;
  terms?: string | null;
  delivery_location?: string | null;
  items: DirectQuoteItemInput[];
  send_now?: boolean;
}

export function useFornecedorQuoteRequests(fornecedorId?: string) {
  return useQuery({
    queryKey: ['fornecedor_quote_requests', fornecedorId || 'all'],
    queryFn: async () => {
      let q = supabase
        .from('quote_requests')
        .select(`
          id, status, requested_deadline, message_to_suppliers, terms,
          delivery_location, fornecedor_id, budget_id, obra_id, created_at,
          fornecedores:fornecedor_id(nome, email),
          orcamentos:budget_id(nome),
          quote_request_items(id, descricao, unidade, quantidade, codigo),
          quote_responses(id, status, total_amount, estimated_delivery_days, notes, valid_until, created_at)
        `)
        .not('fornecedor_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200);
      if (fornecedorId) q = q.eq('fornecedor_id', fornecedorId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateDirectQuoteRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDirectQuoteInput) => {
      if (!user?.id) throw new Error('Não autenticado');
      if (!input.items.length) throw new Error('Adicione pelo menos um item');

      const { data: forn, error: fornErr } = await supabase
        .from('fornecedores')
        .select('organization_id')
        .eq('id', input.fornecedor_id)
        .maybeSingle();
      if (fornErr) throw fornErr;
      if (!forn?.organization_id) throw new Error('Fornecedor sem organização');

      const { data: qr, error: qrErr } = await supabase
        .from('quote_requests')
        .insert({
          builder_user_id: user.id,
          fornecedor_id: input.fornecedor_id,
          organization_id: forn.organization_id,
          budget_id: input.orcamento_id || null,
          obra_id: input.obra_id || null,
          requested_deadline: input.requested_deadline || null,
          message_to_suppliers: input.message_to_suppliers || null,
          terms: input.terms || null,
          delivery_location: input.delivery_location || null,
          status: 'open',
        })
        .select('id')
        .single();
      if (qrErr) throw qrErr;

      const itemRows = input.items.map((it) => ({
        quote_request_id: qr.id,
        descricao: it.descricao,
        unidade: it.unidade || 'un',
        quantidade: Number(it.quantidade) || 0,
        codigo: it.codigo || null,
        capitulo: it.capitulo || null,
        artigo_orcamento_id: it.artigo_orcamento_id || null,
      }));
      const { error: itErr } = await supabase.from('quote_request_items').insert(itemRows);
      if (itErr) throw itErr;

      if (input.send_now) {
        const { error: sendErr } = await supabase.functions.invoke('notify-fornecedor-quote', {
          body: { quote_request_id: qr.id },
        });
        if (sendErr) throw sendErr;
      }
      return qr;
    },
    onSuccess: (_d, vars) => {
      toast({
        title: vars.send_now ? 'Pedido enviado ao fornecedor' : 'Pedido gravado como rascunho',
      });
      qc.invalidateQueries({ queryKey: ['fornecedor_quote_requests'] });
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });
}

export function useSendDirectQuoteRequest() {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke('notify-fornecedor-quote', {
        body: { quote_request_id: id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Pedido enviado' });
      qc.invalidateQueries({ queryKey: ['fornecedor_quote_requests'] });
    },
    onError: (e: any) => {
      toast({ title: 'Erro ao enviar', description: e.message, variant: 'destructive' });
    },
  });
}

export function useCancelDirectQuoteRequest() {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quote_requests')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Pedido cancelado' });
      qc.invalidateQueries({ queryKey: ['fornecedor_quote_requests'] });
    },
  });
}

export function useAwardDirectQuoteResponse() {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ responseId, requestId }: { responseId: string; requestId: string }) => {
      const { error: r1 } = await supabase
        .from('quote_responses')
        .update({ status: 'accepted' })
        .eq('id', responseId);
      if (r1) throw r1;
      const { error: r2 } = await supabase
        .from('quote_requests')
        .update({ status: 'closed' })
        .eq('id', requestId);
      if (r2) throw r2;
    },
    onSuccess: () => {
      toast({ title: 'Proposta adjudicada' });
      qc.invalidateQueries({ queryKey: ['fornecedor_quote_requests'] });
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });
}
