import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PricebookItemDraft {
  codigo_artigo?: string | null;
  descricao: string;
  unidade?: string | null;
  preco_unitario: number;
  iva?: number | null;
  preco_com_iva?: number | null;
  categoria?: string | null;
  marca?: string | null;
  referencia?: string | null;
  lead_time_days?: number | null;
  observacoes?: string | null;
  validade?: string | null;
}

export function useTenantSupplierPricebooks(fornecedorId?: string) {
  return useQuery({
    queryKey: ['tenant_supplier_pricebooks', fornecedorId],
    enabled: !!fornecedorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_supplier_pricebooks')
        .select('*')
        .eq('fornecedor_id', fornecedorId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePricebook() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      fornecedor_id: string;
      name: string;
      categoria?: string | null;
      notes?: string | null;
      valid_from?: string | null;
      valid_to?: string | null;
      file_path?: string | null;
      file_name?: string | null;
      file_type?: string | null;
      file_size_bytes?: number | null;
      items: PricebookItemDraft[];
      origem_importacao?: string;
    }) => {
      if (!user?.id) throw new Error('Não autenticado');

      // Resolve organization_id from fornecedor (guaranteed by RLS to be the user's org)
      const { data: forn, error: fornErr } = await supabase
        .from('fornecedores')
        .select('organization_id')
        .eq('id', input.fornecedor_id)
        .maybeSingle();
      if (fornErr) throw fornErr;
      if (!forn?.organization_id) throw new Error('Fornecedor sem organização');

      const orgId = forn.organization_id;

      const { data: pb, error: pbErr } = await supabase
        .from('tenant_supplier_pricebooks')
        .insert({
          fornecedor_id: input.fornecedor_id,
          organization_id: orgId,
          uploaded_by: user.id,
          name: input.name,
          categoria: input.categoria ?? null,
          notes: input.notes ?? null,
          valid_from: input.valid_from ?? null,
          valid_to: input.valid_to ?? null,
          file_path: input.file_path ?? null,
          file_name: input.file_name ?? null,
          file_type: input.file_type ?? null,
          file_size_bytes: input.file_size_bytes ?? null,
          item_count: input.items.length,
          status: 'active',
        })
        .select('*')
        .single();
      if (pbErr) throw pbErr;

      if (input.items.length > 0) {
        const rows = input.items.map((it) => ({
          pricebook_id: pb.id,
          fornecedor_id: input.fornecedor_id,
          organization_id: orgId,
          descricao: it.descricao,
          codigo_artigo: it.codigo_artigo || null,
          unidade: it.unidade || null,
          preco_unitario: Number(it.preco_unitario) || 0,
          iva: it.iva ?? null,
          categoria: it.categoria || null,
          marca: it.marca || null,
          referencia: it.referencia || null,
          lead_time_days: it.lead_time_days ?? null,
          observacoes: it.observacoes || null,
          validade: it.validade || null,
          origem_importacao: input.origem_importacao || 'manual',
        }));
        const { error: itErr } = await supabase
          .from('tenant_supplier_pricebook_items')
          .insert(rows);
        if (itErr) throw itErr;
      }

      return pb;
    },
    onSuccess: (_pb, vars) => {
      toast({ title: 'Tabela de preços guardada' });
      qc.invalidateQueries({ queryKey: ['tenant_supplier_pricebooks', vars.fornecedor_id] });
    },
    onError: (e: any) => {
      toast({ title: 'Erro ao guardar tabela', description: e.message, variant: 'destructive' });
    },
  });
}
