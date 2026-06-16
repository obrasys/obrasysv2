import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PricebookItemRow {
  id: string;
  pricebook_id: string;
  fornecedor_id: string;
  codigo_artigo: string | null;
  descricao: string;
  unidade: string | null;
  preco_unitario: number;
  iva: number | null;
  categoria: string | null;
  lead_time_days: number | null;
  fornecedor_nome?: string | null;
  pricebook_name?: string | null;
}

export function useTenantPricebookItemsSearch(search: string, fornecedorId?: string) {
  return useQuery({
    queryKey: ['tenant_pricebook_items_search', search, fornecedorId || 'all'],
    queryFn: async () => {
      let q = supabase
        .from('tenant_supplier_pricebook_items')
        .select(`
          id, pricebook_id, fornecedor_id, codigo_artigo, descricao,
          unidade, preco_unitario, iva, categoria, lead_time_days,
          fornecedores:fornecedor_id(nome),
          tenant_supplier_pricebooks:pricebook_id(name, status)
        `)
        .order('descricao')
        .limit(200);

      if (fornecedorId) q = q.eq('fornecedor_id', fornecedorId);
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        q = q.or(`descricao.ilike.${term},codigo_artigo.ilike.${term},categoria.ilike.${term}`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || [])
        .filter((r: any) => r.tenant_supplier_pricebooks?.status !== 'archived')
        .map((r: any) => ({
          ...r,
          fornecedor_nome: r.fornecedores?.nome,
          pricebook_name: r.tenant_supplier_pricebooks?.name,
        })) as PricebookItemRow[];
    },
  });
}
