import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { IcfResumo, IcfConfiguracao } from '@/types/icf';

interface IcfBudgetArticle {
  codigo?: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
  /** Palavras-chave para procurar na base de preços do utilizador */
  match?: string[];
}

interface IcfBudgetChapter {
  numero: number;
  titulo: string;
  descricao?: string;
  artigos: IcfBudgetArticle[];
}

const FORNECEDOR_ICF = 'Ferreira & Alcântara';

/** Preços fallback (ref. mercado PT 2025/2026) — usados quando não há match na base de preços */
const FALLBACK = {
  betao_m3: 95,
  aco_kg: 1.35,
  malha_m2: 4.5,
  trelica_ml: 3.8,
  abobadilha_un: 32.72,
  painel_grafitado_un: 6.67,
  topo_un: 2.58,
  padieira_un: 4.32,
  canto_c3_un: 1.23,
  canto_c4_un: 1.36,
  espacador_un: 1.23,
  mao_obra_m2: 25, // valor de referência do anexo
};

/** Painel ICF padrão: 1.2m x 0.3m = 0.36 m² */
function estimarPaineis(areaLiquida: number): number {
  return Math.ceil(areaLiquida / 0.36);
}

/** Procura preço unitário na base de preços personalizada do utilizador. */
function findPrice(
  precos: Array<{ codigo: string; descricao: string; unidade: string; preco_unitario: number; categoria: string }>,
  keywords: string[],
  unidade?: string,
): number | null {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const kws = keywords.map(norm);
  const candidates = precos.filter(p => {
    const text = norm(`${p.codigo} ${p.descricao} ${p.categoria}`);
    return kws.every(k => text.includes(k));
  });
  const best = unidade
    ? candidates.find(c => norm(c.unidade) === norm(unidade)) ?? candidates[0]
    : candidates[0];
  return best?.preco_unitario ?? null;
}

function buildChapters(
  resumo: IcfResumo,
  config: IcfConfiguracao,
  precos: Array<{ codigo: string; descricao: string; unidade: string; preco_unitario: number; categoria: string }>,
): IcfBudgetChapter[] {
  const chapters: IcfBudgetChapter[] = [];
  const espNucleoCm = config.espessura_nucleo * 100;
  const is22 = espNucleoCm >= 20;

  // Helper para criar artigo com lookup automático
  const art = (
    descricao: string,
    unidade: string,
    quantidade: number,
    fallbackPrice: number,
    matchKeywords: string[],
  ): IcfBudgetArticle => {
    const found = findPrice(precos, matchKeywords, unidade);
    return {
      descricao,
      unidade,
      quantidade: Math.round(quantidade * 1000) / 1000,
      preco_unitario: found ?? fallbackPrice,
      match: matchKeywords,
    };
  };

  // ═══════════════════════════════════════════════════════════
  // CAPÍTULO 1 — SAPATAS (Fundações)
  // ═══════════════════════════════════════════════════════════
  if (resumo.volume_total_fundacoes > 0 || resumo.aco_total_fundacoes > 0) {
    const artigos: IcfBudgetArticle[] = [];
    const areaSapatas = resumo.volume_total_fundacoes / 0.45; // estimativa: altura média 0.45m

    if (resumo.aco_total_fundacoes > 0) {
      artigos.push(art(`Aço ${config.classe_aco} para armaduras de sapatas`, 'kg', resumo.aco_total_fundacoes, FALLBACK.aco_kg, ['aco', 'armadura']));
    }
    if (resumo.volume_total_fundacoes > 0) {
      artigos.push(art(`Betão ${config.classe_betao} para sapatas`, 'm³', resumo.volume_total_fundacoes, FALLBACK.betao_m3, ['betao']));
    }
    if (areaSapatas > 0) {
      artigos.push(art('Mão de obra — execução de sapatas', 'm²', areaSapatas, FALLBACK.mao_obra_m2, ['mao de obra', 'sapata']));
    }

    chapters.push({
      numero: 1,
      titulo: 'Sapatas',
      descricao: `Fundações da estrutura ICF — Configuração "${config.nome}" v${config.versao}`,
      artigos,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // CAPÍTULO 2 — LAJE INFERIOR
  // ═══════════════════════════════════════════════════════════
  // Heurística: dividir lajes em inferior/superior por igual quando não há separação
  const areaLajeTotal = resumo.area_estrutural_total > 0 ? resumo.area_estrutural_total : 0;
  const volLajeTotal = resumo.volume_total_lajes;
  const acoLajeTotal = resumo.aco_total_lajes;
  const areaLajeInf = areaLajeTotal / 2;
  const volLajeInf = volLajeTotal / 2;
  const acoLajeInf = acoLajeTotal / 2;

  if (areaLajeInf > 0 || volLajeInf > 0) {
    const artigos: IcfBudgetArticle[] = [];
    const qtdAbobadilhas = Math.ceil(areaLajeInf / 2); // 1 abobadilha ≈ 2m²
    const qtdMalha = areaLajeInf; // m²
    const mlTrelicas = areaLajeInf * 1.6; // ~1.6 ml/m²

    if (qtdAbobadilhas > 0) {
      artigos.push(art('Abobadilha 2000x1000x170', 'un', qtdAbobadilhas, FALLBACK.abobadilha_un, ['abobadilha']));
    }
    if (qtdMalha > 0) {
      artigos.push(art('Malha electrosoldada para laje', 'm²', qtdMalha, FALLBACK.malha_m2, ['malha']));
    }
    if (mlTrelicas > 0) {
      artigos.push(art('Treliças (vigotas) para laje', 'ml', mlTrelicas, FALLBACK.trelica_ml, ['trelica']));
    }
    if (volLajeInf > 0) {
      artigos.push(art(`Betão ${config.classe_betao} para laje inferior`, 'm³', volLajeInf, FALLBACK.betao_m3, ['betao']));
    }
    if (acoLajeInf > 0) {
      artigos.push(art(`Aço ${config.classe_aco} para laje inferior`, 'kg', acoLajeInf, FALLBACK.aco_kg, ['aco', 'armadura']));
    }
    if (areaLajeInf > 0) {
      artigos.push(art('Mão de obra — execução de laje inferior', 'm²', areaLajeInf, FALLBACK.mao_obra_m2, ['mao de obra', 'laje']));
    }

    chapters.push({
      numero: 2,
      titulo: 'Laje Inferior',
      descricao: 'Laje aligeirada com abobadilha, treliças e malha',
      artigos,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // CAPÍTULO 3 — PANO DE PAREDES (ICF)
  // ═══════════════════════════════════════════════════════════
  if (resumo.area_liquida_total > 0) {
    const artigos: IcfBudgetArticle[] = [];
    const qtdPaineis = estimarPaineis(resumo.area_liquida_total);
    const qtdTopos = Math.ceil(qtdPaineis * 0.15);
    const qtdEspacadores = qtdPaineis * 6;
    const qtdCantosC3 = Math.ceil(resumo.comprimento_total_paredes * 0.2);
    const qtdCantosC4 = Math.ceil(resumo.comprimento_total_paredes * 0.1);
    const qtdPadieiras = resumo.area_total_vaos > 0 ? Math.ceil(resumo.area_total_vaos / 3) : 0;

    artigos.push(art(`Painel grafitado H27 D${espNucleoCm} — ICF`, 'un', qtdPaineis, FALLBACK.painel_grafitado_un, ['painel', 'grafitado']));
    if (qtdPadieiras > 0) {
      artigos.push(art('Padieiras para vãos (vergas)', 'un', qtdPadieiras, FALLBACK.padieira_un, ['padieira']));
    }
    artigos.push(art(`Topos ${is22 ? '22' : '15'}cm`, 'un', qtdTopos, FALLBACK.topo_un, ['topo']));
    artigos.push(art('Cantos C3', 'un', qtdCantosC3, FALLBACK.canto_c3_un, ['canto', 'c3']));
    artigos.push(art('Cantos C4', 'un', qtdCantosC4, FALLBACK.canto_c4_un, ['canto', 'c4']));
    artigos.push(art(`Espaçadores ${is22 ? '22' : '15'}cm`, 'un', qtdEspacadores, FALLBACK.espacador_un, ['espacador']));

    if (resumo.aco_total_fundacoes === 0) {
      // Aço para paredes (estimativa: 35 kg/m³ de betão)
      const acoParedes = resumo.volume_total_paredes * 35;
      if (acoParedes > 0) {
        artigos.push(art(`Aço ${config.classe_aco} para paredes ICF`, 'kg', acoParedes, FALLBACK.aco_kg, ['aco', 'armadura']));
      }
    } else {
      const acoParedes = resumo.volume_total_paredes * 35;
      if (acoParedes > 0) {
        artigos.push(art(`Aço ${config.classe_aco} para paredes ICF`, 'kg', acoParedes, FALLBACK.aco_kg, ['aco', 'armadura']));
      }
    }

    if (resumo.volume_total_paredes > 0) {
      artigos.push(art(`Betão ${config.classe_betao} para enchimento ICF (bombeado)`, 'm³', resumo.volume_total_paredes, FALLBACK.betao_m3, ['betao']));
    }

    artigos.push(art('Mão de obra — montagem de painéis ICF', 'm²', resumo.area_liquida_total, FALLBACK.mao_obra_m2, ['mao de obra', 'icf']));

    chapters.push({
      numero: 3,
      titulo: 'Pano de Paredes',
      descricao: `Sistema ICF — núcleo ${espNucleoCm}cm — Fornecedor de referência: ${FORNECEDOR_ICF}`,
      artigos,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // CAPÍTULO 4 — LAJE SUPERIOR (Cobertura)
  // ═══════════════════════════════════════════════════════════
  const areaLajeSup = areaLajeTotal / 2;
  const volLajeSup = volLajeTotal / 2;
  const acoLajeSup = acoLajeTotal / 2;

  if (areaLajeSup > 0 || volLajeSup > 0) {
    const artigos: IcfBudgetArticle[] = [];
    const qtdAbobadilhas = Math.ceil(areaLajeSup / 2);
    const qtdMalha = areaLajeSup;
    const mlTrelicas = areaLajeSup * 1.6;

    if (qtdAbobadilhas > 0) {
      artigos.push(art('Abobadilha 2000x1000x170 (cobertura)', 'un', qtdAbobadilhas, FALLBACK.abobadilha_un, ['abobadilha']));
    }
    if (qtdMalha > 0) {
      artigos.push(art('Malha electrosoldada para cobertura', 'm²', qtdMalha, FALLBACK.malha_m2, ['malha']));
    }
    if (mlTrelicas > 0) {
      artigos.push(art('Treliças (vigotas) para cobertura', 'ml', mlTrelicas, FALLBACK.trelica_ml, ['trelica']));
    }
    if (volLajeSup > 0) {
      artigos.push(art(`Betão ${config.classe_betao} para laje superior`, 'm³', volLajeSup, FALLBACK.betao_m3, ['betao']));
    }
    if (acoLajeSup > 0) {
      artigos.push(art(`Aço ${config.classe_aco} para laje superior`, 'kg', acoLajeSup, FALLBACK.aco_kg, ['aco', 'armadura']));
    }
    if (areaLajeSup > 0) {
      artigos.push(art('Mão de obra — execução de cobertura', 'm²', areaLajeSup, FALLBACK.mao_obra_m2, ['mao de obra', 'cobertura']));
    }

    chapters.push({
      numero: 4,
      titulo: 'Laje Superior (Cobertura)',
      descricao: 'Cobertura aligeirada com abobadilha, treliças e malha',
      artigos,
    });
  }

  return chapters;
}

export function useGenerateIcfBudget() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ resumo, config, obraId }: { resumo: IcfResumo; config: IcfConfiguracao; obraId: string }) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');

      // 1. Carregar base de preços do utilizador
      const { data: precosData } = await supabase
        .from('base_precos_personalizada')
        .select('codigo, descricao, unidade, preco_unitario, categoria')
        .eq('user_id', user.id);
      const precos = precosData ?? [];

      // 2. Construir capítulos
      const chapters = buildChapters(resumo, config, precos);
      if (chapters.length === 0) throw new Error('Sem quantitativos ICF para gerar orçamento');

      // 3. Generate code
      const { data: codigo, error: codErr } = await supabase.rpc('generate_orcamento_codigo', { p_user_id: user.id });
      if (codErr) throw codErr;

      // 4. Create orçamento
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

      // 5. Criar capítulos + artigos
      for (const cap of chapters) {
        const { data: capRow, error: capErr } = await supabase
          .from('capitulos_orcamento')
          .insert({
            orcamento_id: orc.id,
            numero: cap.numero,
            ordem: cap.numero,
            titulo: cap.titulo,
            descricao: cap.descricao,
          } as any)
          .select()
          .single();
        if (capErr) throw capErr;

        if (cap.artigos.length > 0) {
          const codePrefix = cap.titulo.replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase();
          const artigos = cap.artigos.map((a, i) => ({
            capitulo_id: capRow.id,
            codigo: `ICF.${codePrefix}.${String(i + 1).padStart(2, '0')}`,
            descricao: a.descricao,
            unidade: a.unidade,
            quantidade: a.quantidade,
            preco_unitario: a.preco_unitario,
            ordem: i + 1,
            quantity_source: 'icf_parametric',
          }));
          const { error: artErr } = await supabase.from('artigos_orcamento').insert(artigos as any);
          if (artErr) throw artErr;
        }
      }

      return orc;
    },
    onSuccess: (orc) => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] });
      toast({
        title: 'Orçamento ICF gerado',
        description: `${orc.codigo} criado com 4 capítulos (Sapatas, Laje Inferior, Paredes, Laje Superior)`,
      });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
