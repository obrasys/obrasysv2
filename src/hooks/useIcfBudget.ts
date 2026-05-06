import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { IcfResumo, IcfConfiguracao, IcfLaje } from '@/types/icf';
import { ICF_DEFAULT_CONSTANTS, type IcfCalculationConstants } from '@/hooks/useIcfCalculationConstants';
import {
  buildArchitectureChapters,
  type IcfArchitectureScope,
} from '@/lib/icf-architecture-engine';
import type { PlanQuantitativoRow } from '@/hooks/usePlanQuantitativos';

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

/** Painel ICF — área configurável por utilizador */
function estimarPaineis(areaLiquida: number, painelArea: number): number {
  return Math.ceil(areaLiquida / Math.max(painelArea, 0.01));
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

export function buildChapters(
  resumo: IcfResumo,
  config: IcfConfiguracao,
  precos: Array<{ codigo: string; descricao: string; unidade: string; preco_unitario: number; categoria: string }>,
  lajes: IcfLaje[],
  K: IcfCalculationConstants,
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
    const areaSapatas = resumo.volume_total_fundacoes / Math.max(K.altura_media_sapata_m, 0.01);

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
  // CAPÍTULO 2 — PANO DE PAREDES (ICF)
  // ═══════════════════════════════════════════════════════════
  if (resumo.area_liquida_total > 0) {
    const artigos: IcfBudgetArticle[] = [];
    const qtdPaineis = estimarPaineis(resumo.area_liquida_total, K.painel_area_m2);
    const qtdTopos = Math.ceil(qtdPaineis * K.fator_topos);
    const qtdEspacadores = qtdPaineis * K.espacadores_por_painel;
    const qtdCantosC3 = Math.ceil(resumo.comprimento_total_paredes * K.fator_cantos_c3);
    const qtdCantosC4 = Math.ceil(resumo.comprimento_total_paredes * K.fator_cantos_c4);
    const qtdPadieiras = resumo.area_total_vaos > 0
      ? Math.ceil(resumo.area_total_vaos / Math.max(K.vaos_por_padieira, 0.01))
      : 0;

    artigos.push(art(`Painel grafitado H27 D${espNucleoCm} — ICF`, 'un', qtdPaineis, FALLBACK.painel_grafitado_un, ['painel', 'grafitado']));
    if (qtdPadieiras > 0) {
      artigos.push(art('Padieiras para vãos (vergas)', 'un', qtdPadieiras, FALLBACK.padieira_un, ['padieira']));
    }
    artigos.push(art(`Topos ${is22 ? '22' : '15'}cm`, 'un', qtdTopos, FALLBACK.topo_un, ['topo']));
    artigos.push(art('Cantos C3', 'un', qtdCantosC3, FALLBACK.canto_c3_un, ['canto', 'c3']));
    artigos.push(art('Cantos C4', 'un', qtdCantosC4, FALLBACK.canto_c4_un, ['canto', 'c4']));
    artigos.push(art(`Espaçadores ${is22 ? '22' : '15'}cm`, 'un', qtdEspacadores, FALLBACK.espacador_un, ['espacador']));

    // Aço para paredes (kg por m³ de betão de enchimento — configurável)
    const acoParedes = resumo.volume_total_paredes * K.aco_kg_por_m3_paredes;
    if (acoParedes > 0) {
      artigos.push(art(`Aço ${config.classe_aco} para paredes ICF`, 'kg', acoParedes, FALLBACK.aco_kg, ['aco', 'armadura']));
    }

    if (resumo.volume_total_paredes > 0) {
      artigos.push(art(`Betão ${config.classe_betao} para enchimento ICF (bombeado)`, 'm³', resumo.volume_total_paredes, FALLBACK.betao_m3, ['betao']));
    }

    artigos.push(art('Mão de obra — montagem de painéis ICF', 'm²', resumo.area_liquida_total, FALLBACK.mao_obra_m2, ['mao de obra', 'icf']));

    chapters.push({
      numero: 2,
      titulo: 'Pano de Paredes',
      descricao: `Sistema ICF — núcleo ${espNucleoCm}cm — Fornecedor de referência: ${FORNECEDOR_ICF}`,
      artigos,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // CAPÍTULOS 3+ — LAJES (agrupadas por piso real)
  // ═══════════════════════════════════════════════════════════
  type LajeGroup = { piso: string; area: number; volume: number; aco: number };
  const groups: LajeGroup[] = [];
  if (lajes.length > 0) {
    const map = new Map<string, LajeGroup>();
    for (const l of lajes) {
      const key = (l.piso ?? 'Geral').trim() || 'Geral';
      const g = map.get(key) ?? { piso: key, area: 0, volume: 0, aco: 0 };
      g.area += l.area ?? 0;
      g.volume += l.volume ?? 0;
      g.aco += l.aco_estimado_kg ?? 0;
      map.set(key, g);
    }
    groups.push(...Array.from(map.values()));
  } else if (resumo.area_estrutural_total > 0 || resumo.volume_total_lajes > 0) {
    groups.push({
      piso: 'Lajes',
      area: resumo.area_estrutural_total,
      volume: resumo.volume_total_lajes,
      aco: resumo.aco_total_lajes,
    });
  }

  let lajeChapterNumber = 3;
  for (const g of groups) {
    if (g.area <= 0 && g.volume <= 0) continue;
    const artigos: IcfBudgetArticle[] = [];
    const qtdAbobadilhas = Math.ceil(g.area * K.abobadilhas_por_m2);
    const qtdMalha = g.area;
    const mlTrelicas = g.area * K.trelicas_ml_por_m2;

    if (qtdAbobadilhas > 0) artigos.push(art(`Abobadilha 2000x1000x170 — ${g.piso}`, 'un', qtdAbobadilhas, FALLBACK.abobadilha_un, ['abobadilha']));
    if (qtdMalha > 0) artigos.push(art(`Malha electrosoldada — ${g.piso}`, 'm²', qtdMalha, FALLBACK.malha_m2, ['malha']));
    if (mlTrelicas > 0) artigos.push(art(`Treliças (vigotas) — ${g.piso}`, 'ml', mlTrelicas, FALLBACK.trelica_ml, ['trelica']));
    if (g.volume > 0) artigos.push(art(`Betão ${config.classe_betao} — ${g.piso}`, 'm³', g.volume, FALLBACK.betao_m3, ['betao']));
    if (g.aco > 0) artigos.push(art(`Aço ${config.classe_aco} — ${g.piso}`, 'kg', g.aco, FALLBACK.aco_kg, ['aco', 'armadura']));
    if (g.area > 0) artigos.push(art(`Mão de obra — execução de laje (${g.piso})`, 'm²', g.area, FALLBACK.mao_obra_m2, ['mao de obra', 'laje']));

    chapters.push({
      numero: lajeChapterNumber++,
      titulo: `Laje — ${g.piso}`,
      descricao: 'Laje aligeirada com abobadilha, treliças e malha',
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
    mutationFn: async ({
      resumo,
      config,
      obraId,
      margem_lucro = 15,
      iva_percent = 23,
      estaleiro_valor = 0,
      scope,
    }: {
      resumo: IcfResumo;
      config: IcfConfiguracao;
      obraId: string;
      margem_lucro?: number;
      iva_percent?: number;
      estaleiro_valor?: number;
      /** Âmbito adicional (arquitetura/especialidades). Se omitido = só estrutura. */
      scope?: IcfArchitectureScope;
    }) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');

      // 1. Carregar base de preços do utilizador
      const { data: precosData } = await supabase
        .from('base_precos_personalizada')
        .select('codigo, descricao, unidade, preco_unitario, categoria')
        .eq('user_id', user.id);
      const precos = precosData ?? [];

      // 1b. Carregar lajes reais para agrupamento por piso
      const { data: lajesData } = await supabase
        .from('icf_lajes')
        .select('*')
        .eq('configuracao_id', config.id);
      const lajes = (lajesData ?? []) as unknown as IcfLaje[];

      // 1c. Carregar constantes de cálculo personalizadas (fallback para defaults)
      const { data: constsData } = await (supabase as any)
        .from('icf_calculation_constants')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      const K: IcfCalculationConstants = constsData
        ? {
            aco_kg_por_m3_paredes: Number(constsData.aco_kg_por_m3_paredes),
            painel_area_m2: Number(constsData.painel_area_m2),
            fator_topos: Number(constsData.fator_topos),
            fator_cantos_c3: Number(constsData.fator_cantos_c3),
            fator_cantos_c4: Number(constsData.fator_cantos_c4),
            espacadores_por_painel: Number(constsData.espacadores_por_painel),
            abobadilhas_por_m2: Number(constsData.abobadilhas_por_m2),
            trelicas_ml_por_m2: Number(constsData.trelicas_ml_por_m2),
            altura_media_sapata_m: Number(constsData.altura_media_sapata_m),
            vaos_por_padieira: Number(constsData.vaos_por_padieira),
          }
        : ICF_DEFAULT_CONSTANTS;

      // 2. Construir capítulos com preços de CUSTO.
      // IMPORTANTE: persistimos sempre o custo em preco_unitario.
      // A margem é aplicada apenas pela camada de leitura (Ver.tsx / orcamento-pdf.ts)
      // através da fórmula PV = Custo / (1 - margem%). Persistir o custo evita
      // dupla aplicação de margem e mantém o orçamento auditável.
      const chapters = buildChapters(resumo, config, precos, lajes, K);
      if (chapters.length === 0) throw new Error('Sem quantitativos ICF para gerar orçamento');

      // 3. Subtotal de custo + custos indiretos absolutos (também a custo).
      const subtotalCusto = chapters.reduce(
        (acc, cap) => acc + cap.artigos.reduce((s, a) => s + a.quantidade * a.preco_unitario, 0),
        0,
      );
      const estaleiroAbs = Math.round(subtotalCusto * (custos_indiretos_percent / 100) * 100) / 100;

      // 4. Geração transacional via RPC (atómica + auditada) — só estrutura.
      const titulo = scope?.arquitetura
        ? scope.especialidades.length === 4
          ? `Obra Completa — ${config.nome}`
          : `Estrutura + Arquitetura — ${config.nome}`
        : `Estrutura ICF — ${config.nome}`;

      const { data: result, error: rpcErr } = await supabase.rpc(
        'generate_icf_budget_transactional',
        {
          p_obra_id: obraId,
          p_configuracao_id: config.id,
          p_titulo: titulo,
          p_margem_lucro: margem_lucro,
          p_custos_indiretos: {
            estaleiro: estaleiroAbs,
            seguros: 0,
            licenciamento: 0,
            iva_percent,
            indiretos_percent: custos_indiretos_percent,
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
          p_resumo_snapshot: resumo as any,
        } as any,
      );
      if (rpcErr) throw rpcErr;

      const out = result as { orcamento_id: string; codigo: string };
      const orcamentoId = out.orcamento_id;

      // 5. Se o âmbito incluir arquitetura/especialidades, gerar e inserir
      //    capítulos adicionais (paramétrico + planta quando disponível).
      let extraChaptersCount = 0;
      let extraArtigosCount = 0;
      if (scope?.arquitetura && scope.especialidades.length > 0) {
        // 5a. Procurar planta calibrada da obra (opcional)
        let planRows: PlanQuantitativoRow[] = [];
        try {
          const { data: planRowsData } = await supabase
            .from('plan_quantitativos_v' as any)
            .select('*')
            .eq('obra_id', obraId);
          planRows = (planRowsData ?? []) as unknown as PlanQuantitativoRow[];
        } catch {
          // tabela/view pode não estar acessível para o user — ignora.
          planRows = [];
        }

        const startNumero = chapters.length + 1;
        const { chapters: extra } = buildArchitectureChapters({
          resumo,
          config,
          scope,
          planRows,
          precos,
          startNumero,
        });

        for (const cap of extra) {
          const { data: capRow, error: capErr } = await supabase
            .from('capitulos_orcamento')
            .insert({
              orcamento_id: orcamentoId,
              numero: cap.numero,
              ordem: cap.numero,
              titulo: cap.titulo,
              descricao: cap.descricao ?? null,
            } as any)
            .select('id')
            .single();
          if (capErr) throw capErr;
          extraChaptersCount += 1;

          if (cap.artigos.length > 0) {
            const rows = cap.artigos.map((a, idx) => ({
              capitulo_id: (capRow as any).id,
              codigo: a.codigo ?? `ARQ.${cap.numero}.${String(idx + 1).padStart(2, '0')}`,
              descricao: a.descricao,
              unidade: a.unidade,
              quantidade: a.quantidade,
              preco_unitario: a.preco_unitario,
              preco_base: a.preco_unitario,
              ordem: idx + 1,
              quantity_source: 'icf_architecture',
            }));
            const { error: artErr } = await supabase
              .from('artigos_orcamento')
              .insert(rows as any);
            if (artErr) throw artErr;
            extraArtigosCount += rows.length;
          }
        }
      }

      return {
        id: orcamentoId,
        codigo: out.codigo,
        extraChaptersCount,
        extraArtigosCount,
      };
    },
    onSuccess: (orc) => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] });
      const extra = orc.extraChaptersCount
        ? ` + ${orc.extraChaptersCount} capítulos de arquitetura`
        : '';
      toast({
        title: 'Orçamento ICF gerado',
        description: `${orc.codigo} criado a partir do módulo ICF${extra}`,
      });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
