import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  ICFWallPanel,
  ICFWallCompositionResult,
  ICFAccessoryEstimate,
} from '@/types/icf-homeblock';

export function useIcfWallPanels(obraId?: string) {
  return useQuery({
    queryKey: ['icf-wall-panels', obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('icf_wall_panels' as any)
        .select('*')
        .eq('obra_id', obraId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ICFWallPanel[];
    },
    enabled: !!obraId,
  });
}

export function useCreateIcfWallPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: Partial<ICFWallPanel>) => {
      const payload: any = { ...values };
      if (payload.openings && typeof payload.openings !== 'string') {
        // ok – Supabase aceita jsonb
      }
      const { data, error } = await supabase
        .from('icf_wall_panels' as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['icf-wall-panels', v.obra_id] });
      toast({ title: 'Pano adicionado' });
    },
    onError: (e: any) =>
      toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateIcfWallPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<ICFWallPanel> & { id: string }) => {
      const { error } = await supabase
        .from('icf_wall_panels' as any)
        .update(values as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icf-wall-panels'] }),
    onError: (e: any) =>
      toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteIcfWallPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('icf_wall_panels' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['icf-wall-panels'] });
      toast({ title: 'Pano eliminado' });
    },
    onError: (e: any) =>
      toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useSaveCompositionResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, result }: { id: string; result: ICFWallCompositionResult }) => {
      const { error } = await supabase
        .from('icf_wall_panels' as any)
        .update({
          composition_result: result as any,
          net_area_m2: result.net_area_m2,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icf-wall-panels'] }),
  });
}

/** Preços fallback de referência (mercado PT 2025/26). */
const HOMEBLOCK_FALLBACK_PRICES: Record<string, number> = {
  'HB-BLOCO-220': 14.5,
  'HB-BLOCO-300': 17.9,
  'HB-TOPO-150': 2.4,
  'HB-TOPO-220': 2.8,
  'HB-ESP-150': 1.2,
  'HB-ESP-220': 1.3,
};

const BLOCK_NAME: Record<string, string> = {
  'HB-BLOCO-220': 'HOMEBLOCK Bloco 22 cm (1200×300×220 mm)',
  'HB-BLOCO-300': 'HOMEBLOCK Bloco 30 cm (1200×300×300 mm)',
  'HB-TOPO-150': 'HOMEBLOCK Topo 15 cm',
  'HB-TOPO-220': 'HOMEBLOCK Topo 22 cm',
  'HB-ESP-150': 'HOMEBLOCK Espaçador 15 cm',
  'HB-ESP-220': 'HOMEBLOCK Espaçador 22 cm',
};

interface SendArgs {
  obraId: string;
  configuracaoId: string;
  margem_lucro?: number;
  iva_percent?: number;
}

/**
 * Agrega panos validados e gera um capítulo "Sistema ICF / HOMEBLOCK"
 * via a RPC `generate_icf_budget_transactional` existente.
 */
export function useSendWallPanelsToBudget() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ obraId, configuracaoId, margem_lucro = 0.2, iva_percent = 23 }: SendArgs) => {
      const { data: panelsData, error: panelsErr } = await supabase
        .from('icf_wall_panels' as any)
        .select('*')
        .eq('obra_id', obraId)
        .eq('status', 'validado');
      if (panelsErr) throw panelsErr;
      const panels = (panelsData ?? []) as unknown as ICFWallPanel[];
      if (panels.length === 0) {
        throw new Error('Nenhum pano validado para enviar para orçamento.');
      }

      const { data: configData, error: configErr } = await supabase
        .from('icf_configuracoes')
        .select('*')
        .eq('id', configuracaoId)
        .single();
      if (configErr) throw configErr;
      const config = configData as any;

      const blockQty: Record<string, number> = {};
      const accQty: Record<string, { name: string; qty: number; unit: string }> = {};
      let totalGross = 0;
      let totalNet = 0;
      const warningsAll: string[] = [];

      for (const p of panels) {
        const r = p.composition_result as ICFWallCompositionResult | null;
        totalGross += Number(p.gross_area_m2) || 0;
        totalNet += Number(p.net_area_m2 ?? 0) || 0;
        if (!r) {
          warningsAll.push(`Pano "${p.label}" sem composição calculada - ignorado.`);
          continue;
        }
        blockQty[r.block_code] = (blockQty[r.block_code] || 0) + (r.estimated_final_block_qty || 0);
        for (const a of (r.accessories || []) as ICFAccessoryEstimate[]) {
          if (!accQty[a.code]) accQty[a.code] = { name: a.name, qty: 0, unit: a.unit || 'un' };
          accQty[a.code].qty += a.estimated_qty || 0;
        }
        for (const w of r.warnings || []) warningsAll.push(`[${p.label}] ${w}`);
      }

      const artigos: any[] = [];
      Object.entries(blockQty).forEach(([code, qty]) => {
        if (qty <= 0) return;
        artigos.push({
          codigo: code,
          descricao: BLOCK_NAME[code] || code,
          unidade: 'un',
          quantidade: qty,
          preco_unitario: HOMEBLOCK_FALLBACK_PRICES[code] ?? 0,
        });
      });
      Object.entries(accQty).forEach(([code, a]) => {
        if (a.qty <= 0) return;
        artigos.push({
          codigo: code,
          descricao: BLOCK_NAME[code] || a.name,
          unidade: a.unit,
          quantidade: Math.ceil(a.qty),
          preco_unitario: HOMEBLOCK_FALLBACK_PRICES[code] ?? 0,
        });
      });

      if (artigos.length === 0) {
        throw new Error('Sem artigos - verifique se os panos validados têm composição calculada.');
      }

      const chapters = [
        {
          numero: 1,
          titulo: 'Sistema ICF / HOMEBLOCK',
          descricao: `Composição HOMEBLOCK a partir de ${panels.length} pano(s) validado(s). Área bruta ${totalGross.toFixed(2)} m² · líquida ${totalNet.toFixed(2)} m². Estimativa assistida - sujeita a revisão técnica.`,
          artigos,
        },
      ];

      const { data: result, error: rpcErr } = await supabase.rpc(
        'generate_icf_budget_transactional',
        {
          p_obra_id: obraId,
          p_configuracao_id: configuracaoId,
          p_titulo: `Sistema ICF / HOMEBLOCK - ${config.nome}`,
          p_margem_lucro: margem_lucro,
          p_custos_indiretos: {
            estaleiro: 0,
            seguros: 0,
            licenciamento: 0,
            iva_percent,
            indiretos_percent: 0,
          },
          p_chapters: chapters as any,
          p_config_snapshot: {
            id: config.id,
            nome: config.nome,
            versao: config.versao,
            espessura_nucleo: config.espessura_nucleo,
            classe_betao: config.classe_betao,
            classe_aco: config.classe_aco,
          } as any,
          p_resumo_snapshot: {
            source: 'homeblock_wall_panels',
            panels_count: panels.length,
            gross_area_m2: totalGross,
            net_area_m2: totalNet,
            warnings: warningsAll,
          } as any,
        } as any,
      );
      if (rpcErr) throw rpcErr;

      const out = result as { orcamento_id: string; codigo: string };

      await supabase
        .from('icf_wall_panels' as any)
        .update({ status: 'enviado_orcamento' })
        .in('id', panels.map(p => p.id));

      return out;
    },
    onSuccess: (out) => {
      qc.invalidateQueries({ queryKey: ['icf-wall-panels'] });
      toast({ title: 'Orçamento gerado', description: `Capítulo HOMEBLOCK enviado (${out.codigo}).` });
    },
    onError: (e: any) =>
      toast({ title: 'Erro ao enviar', description: e.message, variant: 'destructive' }),
  });
}
