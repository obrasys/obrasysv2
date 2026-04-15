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

/** Fornecedor de referência ICF */
const FORNECEDOR_ICF = 'Ferreira & Alcântara';

/** Preços de referência ICF — Ferreira & Alcântara (NIF 519134087) */
const PRECOS_MATERIAIS_ICF = {
  painel_75_grafitado: { ref: 'EXE.4', desc: 'Painel 7.5 Grafitado H27 D30', preco: 6.67, unidade: 'un' },
  abobadilha_170: { ref: 'EXE.3', desc: 'Abobadilha 2000x1000x170', preco: 32.72, unidade: 'un' },
  topo_grafitado_15: { ref: 'EXE.5', desc: 'Topo Grafitado 15cm', preco: 2.58, unidade: 'un' },
  topo_branco_22: { ref: 'EXE.40', desc: 'Topo Branco 22cm', preco: 6.20, unidade: 'un' },
  padieira_15_grafitado: { ref: 'EXE.6', desc: 'Padieira 15 Grafitado', preco: 4.32, unidade: 'un' },
  espacador_15: { ref: 'EXE.7', desc: 'Espaçador 15cm', preco: 1.23, unidade: 'un' },
  espacador_22: { ref: 'EXE.39', desc: 'Espaçador 22cm', preco: 1.36, unidade: 'un' },
  cantos_c3: { ref: 'EXE.8', desc: 'Cantos C3', preco: 1.23, unidade: 'un' },
  cantos_c4: { ref: 'EXE.9', desc: 'Cantos C4', preco: 1.36, unidade: 'un' },
};

/** Preços de referência para mão de obra e betão — mercado PT 2025/2026 */
const PRECOS_REF = {
  betao_m3: 95,
  aco_kg: 1.35,
  cofragem_icf_m2: 42,
  laje_vigotas_m2: 38,
};

/**
 * Estima a quantidade de painéis ICF necessários com base na área líquida.
 * Painel padrão: 1.2m x 0.3m = 0.36 m² (área coberta por unidade).
 */
function estimarPaineisIcf(areaLiquida: number): number {
  const AREA_PAINEL = 0.36; // m² por painel
  return Math.ceil(areaLiquida / AREA_PAINEL);
}

function buildArticles(resumo: IcfResumo, config: IcfConfiguracao): IcfBudgetArticle[] {
  const articles: IcfBudgetArticle[] = [];
  const espNucleo = config.espessura_nucleo * 100; // m → cm
  const is22 = espNucleo >= 20;

  // ── Capítulo: Materiais ICF (Fornecedor Ferreira & Alcântara) ──

  if (resumo.area_liquida_total > 0) {
    const qtdPaineis = estimarPaineisIcf(resumo.area_liquida_total);

    // 1. Painéis ICF
    articles.push({
      descricao: `${PRECOS_MATERIAIS_ICF.painel_75_grafitado.desc} [Ref: ${PRECOS_MATERIAIS_ICF.painel_75_grafitado.ref}] — Fornecedor: ${FORNECEDOR_ICF}`,
      unidade: 'un',
      quantidade: qtdPaineis,
      preco_unitario: PRECOS_MATERIAIS_ICF.painel_75_grafitado.preco,
    });

    // 2. Topos
    const topo = is22 ? PRECOS_MATERIAIS_ICF.topo_branco_22 : PRECOS_MATERIAIS_ICF.topo_grafitado_15;
    const qtdTopos = Math.ceil(qtdPaineis * 0.15); // ~15% do nº de painéis
    articles.push({
      descricao: `${topo.desc} [Ref: ${topo.ref}] — Fornecedor: ${FORNECEDOR_ICF}`,
      unidade: 'un',
      quantidade: qtdTopos,
      preco_unitario: topo.preco,
    });

    // 3. Espaçadores
    const espacador = is22 ? PRECOS_MATERIAIS_ICF.espacador_22 : PRECOS_MATERIAIS_ICF.espacador_15;
    const qtdEspacadores = qtdPaineis * 6; // ~6 espaçadores por painel
    articles.push({
      descricao: `${espacador.desc} [Ref: ${espacador.ref}] — Fornecedor: ${FORNECEDOR_ICF}`,
      unidade: 'un',
      quantidade: qtdEspacadores,
      preco_unitario: espacador.preco,
    });

    // 4. Cantos (estimativa baseada em perímetro)
    const qtdCantos = Math.ceil(resumo.comprimento_total_paredes * 0.3);
    if (qtdCantos > 0) {
      articles.push({
        descricao: `${PRECOS_MATERIAIS_ICF.cantos_c3.desc} [Ref: ${PRECOS_MATERIAIS_ICF.cantos_c3.ref}] — Fornecedor: ${FORNECEDOR_ICF}`,
        unidade: 'un',
        quantidade: qtdCantos,
        preco_unitario: PRECOS_MATERIAIS_ICF.cantos_c3.preco,
      });
    }

    // 5. Padieiras (estimativa: 1 por cada 3m² de vãos)
    if (resumo.area_total_vaos > 0) {
      const qtdPadieiras = Math.ceil(resumo.area_total_vaos / 3);
      articles.push({
        descricao: `${PRECOS_MATERIAIS_ICF.padieira_15_grafitado.desc} [Ref: ${PRECOS_MATERIAIS_ICF.padieira_15_grafitado.ref}] — Fornecedor: ${FORNECEDOR_ICF}`,
        unidade: 'un',
        quantidade: qtdPadieiras,
        preco_unitario: PRECOS_MATERIAIS_ICF.padieira_15_grafitado.preco,
      });
    }
  }

  // ── Abobadilhas para lajes ──
  if (resumo.volume_total_lajes > 0 && resumo.area_estrutural_total > 0) {
    const qtdAbobadilhas = Math.ceil(resumo.area_estrutural_total / 2); // 1 abobadilha ≈ 2m²
    articles.push({
      descricao: `${PRECOS_MATERIAIS_ICF.abobadilha_170.desc} [Ref: ${PRECOS_MATERIAIS_ICF.abobadilha_170.ref}] — Fornecedor: ${FORNECEDOR_ICF}`,
      unidade: 'un',
      quantidade: qtdAbobadilhas,
      preco_unitario: PRECOS_MATERIAIS_ICF.abobadilha_170.preco,
    });
  }

  // ── Mão de obra e betão ──

  if (resumo.area_liquida_total > 0) {
    articles.push({
      descricao: `Montagem de sistema ICF (mão de obra), espessura núcleo ${config.espessura_nucleo}m, classe ${config.classe_betao}`,
      unidade: 'm²',
      quantidade: Math.round(resumo.area_liquida_total * 100) / 100,
      preco_unitario: PRECOS_REF.cofragem_icf_m2,
    });
  }

  if (resumo.volume_total_paredes > 0) {
    articles.push({
      descricao: `Betão ${config.classe_betao} para enchimento de paredes ICF, incluindo bombagem e vibração`,
      unidade: 'm³',
      quantidade: Math.round(resumo.volume_total_paredes * 1000) / 1000,
      preco_unitario: PRECOS_REF.betao_m3,
    });
  }

  if (resumo.volume_total_fundacoes > 0) {
    articles.push({
      descricao: `Betão ${config.classe_betao} para fundações (sapatas), incluindo colocação e vibração`,
      unidade: 'm³',
      quantidade: Math.round(resumo.volume_total_fundacoes * 1000) / 1000,
      preco_unitario: PRECOS_REF.betao_m3,
    });
  }

  if (resumo.aco_total_fundacoes > 0) {
    articles.push({
      descricao: `Aço ${config.classe_aco} para armaduras de fundações, cortado, dobrado e colocado (incl. perdas ${(config.fator_perdas ?? 5) > 1 ? (config.fator_perdas ?? 5).toFixed(0) : ((config.fator_perdas ?? 0.05) * 100).toFixed(0)}% e amarração ${(config.fator_transpasse ?? 10) > 1 ? (config.fator_transpasse ?? 10).toFixed(0) : ((config.fator_transpasse ?? 0.10) * 100).toFixed(0)}%)`,
      unidade: 'kg',
      quantidade: Math.round(resumo.aco_total_fundacoes * 10) / 10,
      preco_unitario: PRECOS_REF.aco_kg,
    });
  }

  if (resumo.volume_total_lajes > 0) {
    articles.push({
      descricao: `Betão ${config.classe_betao} para lajes, incluindo colocação e vibração`,
      unidade: 'm³',
      quantidade: Math.round(resumo.volume_total_lajes * 1000) / 1000,
      preco_unitario: PRECOS_REF.betao_m3,
    });
  }

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

      // 3. Create chapter — Materiais ICF
      const { data: capMat, error: capMatErr } = await supabase
        .from('capitulos_orcamento')
        .insert({
          orcamento_id: orc.id,
          numero: 1,
          ordem: 1,
          titulo: `Materiais ICF — ${FORNECEDOR_ICF}`,
          descricao: `Materiais ICF com preços de referência do fornecedor ${FORNECEDOR_ICF} (NIF 519134087). Gerado a partir da configuração "${config.nome}" (v${config.versao})`,
        } as any)
        .select()
        .single();
      if (capMatErr) throw capMatErr;

      // 4. Create chapter — Mão de Obra e Betão
      const { data: capMO, error: capMOErr } = await supabase
        .from('capitulos_orcamento')
        .insert({
          orcamento_id: orc.id,
          numero: 2,
          ordem: 2,
          titulo: 'Estrutura — Mão de Obra e Betão',
          descricao: `Betão, aço e montagem. Configuração ICF "${config.nome}" (v${config.versao})`,
        } as any)
        .select()
        .single();
      if (capMOErr) throw capMOErr;

      // 5. Split articles into materials (supplier) vs labour/concrete
      const materialArticles = articles.filter(a => a.descricao.includes(FORNECEDOR_ICF));
      const labourArticles = articles.filter(a => !a.descricao.includes(FORNECEDOR_ICF));

      const artigosMat = materialArticles.map((a, i) => ({
        capitulo_id: capMat.id,
        codigo: `ICF.MAT.${String(i + 1).padStart(2, '0')}`,
        descricao: a.descricao,
        unidade: a.unidade,
        quantidade: a.quantidade,
        preco_unitario: a.preco_unitario,
        ordem: i + 1,
        quantity_source: 'icf_parametric',
      }));

      const artigosMO = labourArticles.map((a, i) => ({
        capitulo_id: capMO.id,
        codigo: `ICF.MO.${String(i + 1).padStart(2, '0')}`,
        descricao: a.descricao,
        unidade: a.unidade,
        quantidade: a.quantidade,
        preco_unitario: a.preco_unitario,
        ordem: i + 1,
        quantity_source: 'icf_parametric',
      }));

      const allArtigos = [...artigosMat, ...artigosMO];
      if (allArtigos.length > 0) {
        const { error: artErr } = await supabase.from('artigos_orcamento').insert(allArtigos as any);
        if (artErr) throw artErr;
      }

      return orc;
    },
    onSuccess: (orc) => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] });
      toast({ title: 'Orçamento ICF gerado', description: `${orc.codigo} criado com sucesso (preços ${FORNECEDOR_ICF})` });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
