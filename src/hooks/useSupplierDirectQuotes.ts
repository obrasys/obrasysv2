import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { CreateQuoteResponseForm } from '@/types/suppliers';

/**
 * Direct (tenant→fornecedor) quote requests received by the logged-in supplier.
 * Matches `quote_requests.fornecedor_id` to the supplier's linked tenant
 * fornecedores rows via `tenant_supplier_links`.
 */
export function useSupplierDirectQuoteRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['supplier-direct-quote-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: profile } = await supabase
        .from('supplier_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!profile) return [];

      const { data: links } = await supabase
        .from('tenant_supplier_links')
        .select('fornecedor_id, organization_id')
        .eq('supplier_profile_id', profile.id)
        .eq('status', 'active');
      const fornecedorIds = (links || [])
        .map((l: any) => l.fornecedor_id)
        .filter(Boolean);
      if (fornecedorIds.length === 0) return [];

      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          id, status, requested_deadline, message_to_suppliers, terms,
          delivery_location, fornecedor_id, organization_id, budget_id, obra_id, created_at,
          fornecedores:fornecedor_id(nome),
          organizations:organization_id(name),
          orcamentos:budget_id(nome),
          quote_request_items(id, descricao, unidade, quantidade, codigo, capitulo),
          quote_responses(id, status, total_amount, supplier_id, created_at)
        `)
        .in('fornecedor_id', fornecedorIds)
        .not('fornecedor_id', 'is', null)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      // Mark whether this supplier has already responded
      return (data || []).map((qr: any) => ({
        ...qr,
        already_responded: (qr.quote_responses || []).some(
          (r: any) => r.supplier_id === profile.id
        ),
      }));
    },
    enabled: !!user?.id,
  });
}

/** Create a quote response for a DIRECT quote (no quote_request_suppliers row). */
export function useCreateDirectQuoteResponse() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      quoteRequestId,
      form,
    }: {
      quoteRequestId: string;
      form: CreateQuoteResponseForm;
    }) => {
      if (!user?.id) throw new Error('Não autenticado');

      const { data: profile } = await supabase
        .from('supplier_profiles')
        .select('id, trade_name, legal_name')
        .eq('user_id', user.id)
        .single();
      if (!profile) throw new Error('Perfil de fornecedor não encontrado');

      const { data: qr } = await supabase
        .from('quote_requests')
        .select('id, organization_id, builder_user_id')
        .eq('id', quoteRequestId)
        .single();
      if (!qr) throw new Error('Pedido não encontrado');

      const total = form.items.reduce(
        (sum, it) => sum + it.qty * it.unit_price,
        0
      );

      const { data: resp, error: respErr } = await supabase
        .from('quote_responses')
        .insert({
          quote_request_id: quoteRequestId,
          supplier_id: profile.id,
          organization_id: qr.organization_id,
          total_amount: total,
          estimated_delivery_days: form.estimated_delivery_days || null,
          notes: form.notes || null,
          status: 'sent',
        })
        .select()
        .single();
      if (respErr) throw respErr;

      if (form.items.length > 0) {
        const { error: itErr } = await supabase
          .from('quote_response_items')
          .insert(
            form.items.map((it) => ({
              quote_response_id: resp.id,
              item_name: it.item_name,
              unit: it.unit,
              qty: it.qty,
              unit_price: it.unit_price,
              vat_rate: it.vat_rate,
              line_total: it.qty * it.unit_price,
              lead_time_days: it.lead_time_days || 1,
              notes: it.notes || null,
              source_pricebook_item_id: it.source_pricebook_item_id || null,
            }))
          );
        if (itErr) throw itErr;
      }

      // Move request status forward so the builder sees "Em análise"
      await supabase
        .from('quote_requests')
        .update({ status: 'in_review' })
        .eq('id', quoteRequestId);

      // In-app notification for the builder
      if (qr.builder_user_id) {
        const supplierName =
          profile.trade_name || profile.legal_name || 'Fornecedor';
        await supabase.from('user_notifications').insert({
          user_id: qr.builder_user_id,
          type: 'cotacao_respondida',
          title: `${supplierName} respondeu à sua cotação`,
          message: new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR',
          }).format(total),
          link: '/financeiro/cotacoes',
        });
      }

      return resp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-direct-quote-requests'] });
      toast({ title: 'Proposta enviada com sucesso!' });
    },
    onError: (e: any) => {
      toast({
        title: 'Erro ao enviar proposta',
        description: e.message,
        variant: 'destructive',
      });
    },
  });
}

/** Decline a direct quote request (no assignment row to update — best-effort marker). */
export function useDeclineDirectQuote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (_quoteRequestId: string) => {
      // No-op on quote_requests (builder owns status). Treated as silent decline.
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-direct-quote-requests'] });
      toast({ title: 'Pedido marcado como recusado' });
    },
  });
}
