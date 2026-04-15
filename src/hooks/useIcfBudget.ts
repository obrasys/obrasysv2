import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { IcfResumo, IcfConfiguracao } from '@/types/icf';

interface IcfBudgetArticle {
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
}

/** Preços de referência ICF — mercado PT 2025/2026 */
const PRECOS_REF = {
  betao_m3: 95,         // €/m³ C30/37 incluindo colocação
  aco_kg: 1.35,         // €/kg A500 cortado, dobrado e colocado
  cofragem_icf_m2: 42,  // €/m² sistema ICF (blocos + montagem)
  laje_vigotas_m2: 38,  // €/m² laje de vigotas pré-esforçadas
};

function buildArticles(resumo: IcfResumo, config: IcfConfiguracao): IcfBudgetArticle[] {
  const articles: IcfBudgetArticle[] = [];

  // 1. Cofragem ICF (m²) — paredes
  if (resumo.area_liquida_total > 0) {
    articles.push({
      descricao: `Fornecimento e montagem de sistema ICF (cofragem isolante permanente) para paredes, espessura núcleo ${config.espessura_nucleo}m, classe ${config.classe_betao}`,
      unidade: 'm²',
      quantidade: Math.round(resumo.area_liquida_total * 100) / 100,
      preco_unitario: PRECOS_REF.cofragem_icf_m2,
    });
  }

  // 2. Betão paredes (m³)
  if (resumo.volume_total_paredes > 0) {
    articles.push({
      descricao: `Betão ${config.classe_betao} para enchimento de paredes ICF, incluindo bombagem e vibração`,
      unidade: 'm³',
      quantidade: Math.round(resumo.volume_total_paredes * 1000) / 1000,
      preco_unitario: PRECOS_REF.betao_m3,
    });
  }

  // 3. Betão fundações (m³)
  if (resumo.volume_total_fundacoes > 0) {
    articles.push({
      descricao: `Betão ${config.classe_betao} para fundações (sapatas), incluindo colocação e vibração`,
      unidade: 'm³',
      quantidade: Math.round(resumo.volume_total_fundacoes * 1000) / 1000,
      preco_unitario: PRECOS_REF.betao_m3,
    });
  }

  // 4. Aço fundações (kg)
  if (resumo.aco_total_fundacoes > 0) {
    articles.push({
      descricao: `Aço ${config.classe_aco} para armaduras de fundações, cortado, dobrado e colocado (incl. perdas ${((config.fator_perdas ?? 0.05) * 100).toFixed(0)}% e amarração ${((config.fator_transpasse ?? 0.10) * 100).toFixed(0)}%)`,
      unidade: 'kg',
      quantidade: Math.round(resumo.aco_total_fundacoes * 10) / 10,
      preco_unitario: PRECOS_REF.aco_kg,
    });
  }

  // 5. Betão lajes (m³)
  if (resumo.volume_total_lajes > 0) {
    articles.push({
      descricao: `Betão ${config.classe_betao} para lajes, incluindo colocação e vibração`,
      unidade: 'm³',
      quantidade: Math.round(resumo.volume_total_lajes * 1000) / 1000,
      preco_unitario: PRECOS_REF.betao_m3,
    });
  }

  // 6. Aço lajes (kg)
  if (resumo.aco_total_lajes > 0) {
    articles.push({
      descricao: `Aço ${config.classe_aco} para armaduras de lajes, cortado, dobrado e colocado`,
      unidade: 'kg',
      quantidade: Math.round(resumo.aco_total_lajes * 10) / 10,
      preco_unitario: PRECOS_REF.aco_kg,
    });
  }

  return articles;
}

export function useGenerateIcfBudget() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ resumo, config, obraId }: { resumo: IcfResumo; config: IcfConfiguracao; obraId: string }) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');

      const articles = buildArticles(resumo, config);
      if (articles.length === 0) throw new Error('Sem quantitativos ICF para gerar orçamento');

      // 1. Generate code
      const { data: codigo, error: codErr } = await supabase.rpc('generate_orcamento_codigo', { p_user_id: user.id });
      if (codErr) throw codErr;

      // 2. Create orçamento
      const { data: orc, error: orcErr } = await supabase
        .from('orcamentos')
        .insert({
          user_id: user.id,
          titulo: `Estrutura ICF — ${config.nome}`,
          codigo,
          obra_id: obraId,
          margem_lucro: 15,
          status: 'rascunho',
        } as any)
        .select()
        .single();
      if (orcErr) throw orcErr;

      // 3. Create chapter
      const { data: cap, error: capErr } = await supabase
        .from('capitulos_orcamento')
        .insert({
          orcamento_id: orc.id,
          numero: 1,
          ordem: 1,
          titulo: 'Estrutura ICF',
          descricao: `Capítulo gerado automaticamente a partir da configuração ICF "${config.nome}" (v${config.versao})`,
        } as any)
        .select()
        .single();
      if (capErr) throw capErr;

      // 4. Create articles
      const artigos = articles.map((a, i) => ({
        capitulo_id: cap.id,
        codigo: `ICF.${String(i + 1).padStart(2, '0')}`,
        descricao: a.descricao,
        unidade: a.unidade,
        quantidade: a.quantidade,
        preco_unitario: a.preco_unitario,
        valor_total: Math.round(a.quantidade * a.preco_unitario * 100) / 100,
        ordem: i + 1,
        quantity_source: 'icf_parametric',
      }));

      const { error: artErr } = await supabase.from('artigos_orcamento').insert(artigos as any);
      if (artErr) throw artErr;

      return orc;
    },
    onSuccess: (orc) => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] });
      toast({ title: 'Orçamento ICF gerado', description: `${orc.codigo} criado com sucesso` });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
