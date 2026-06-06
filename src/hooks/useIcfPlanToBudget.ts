/**
 * Fase 8 — Integração com orçamento a partir dos quantitativos ICF unificados.
 *
 * Recebe o resultado consolidado (Fase 6/7) e cria um novo orçamento OU
 * acrescenta capítulos a um orçamento existente, sem mexer nos RPC ICF
 * complexos já em uso. Os artigos ficam marcados com:
 *   source: 'axia_icf_planta'
 *   linked_element_id: plan_analysis_version_id
 *   chapter_code/article_code: 'ICF_PLANTA_*'
 * para rastreabilidade plan_import → versão → orçamento.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { IcfPlantAnalysisResult } from "@/hooks/useIcfPlantAnalysis";
import type {
  IcfUnifiedQuantities,
  IcfUnifiedParams,
} from "@/lib/icf-unified-quantities";

const FALLBACK_PRICES = {
  bloco_un: 6.67,
  betao_m3: 95,
  aco_kg: 1.35,
  mao_obra_m2: 25,
} as const;

interface PlanoChapter {
  titulo: string;
  descricao?: string;
  artigos: Array<{
    descricao: string;
    unidade: string;
    quantidade: number;
    preco_unitario: number;
    article_code: string;
  }>;
}

export function buildIcfPlanChapters(
  q: IcfUnifiedQuantities,
  params: IcfUnifiedParams,
): PlanoChapter[] {
  const t = q.totais;
  const chapters: PlanoChapter[] = [];

  // Paredes ICF — agrupadas por tipo (ext/int)
  const areaExt = q.linhas
    .filter((l) => l.tipo === "exterior")
    .reduce((s, l) => s + l.area_liquida_m2, 0);
  const areaInt = q.linhas
    .filter((l) => l.tipo === "interior")
    .reduce((s, l) => s + l.area_liquida_m2, 0);
  const areaInd = q.linhas
    .filter((l) => l.tipo === "indeterminado")
    .reduce((s, l) => s + l.area_liquida_m2, 0);

  if (areaExt > 0 || areaInd > 0) {
    chapters.push({
      titulo: "Paredes ICF — Exteriores",
      descricao: `Origem: ${q.origem.toUpperCase()} · ${areaExt.toFixed(2)} m² ext + ${areaInd.toFixed(2)} m² indeterminadas (assumidas como ext).`,
      artigos: [
        {
          descricao: `Pano de parede ICF exterior (núcleo ${(params.espessuraNucleoPadrao * 100).toFixed(0)}cm)`,
          unidade: "m²",
          quantidade: round(areaExt + areaInd, 2),
          preco_unitario: 0,
          article_code: "ICF_PLANTA_PAREDE_EXT",
        },
      ],
    });
  }

  if (areaInt > 0) {
    chapters.push({
      titulo: "Paredes ICF — Interiores",
      descricao: `Origem: ${q.origem.toUpperCase()} · ${areaInt.toFixed(2)} m² interiores.`,
      artigos: [
        {
          descricao: `Pano de parede ICF interior (núcleo ${(params.espessuraNucleoPadrao * 100).toFixed(0)}cm)`,
          unidade: "m²",
          quantidade: round(areaInt, 2),
          preco_unitario: 0,
          article_code: "ICF_PLANTA_PAREDE_INT",
        },
      ],
    });
  }

  // Blocos ICF
  if (t.blocos_com_desperdicio > 0) {
    chapters.push({
      titulo: "Blocos ICF",
      descricao: `Bloco ${params.bloco.codigo} (${params.bloco.comprimentoMm}×${params.bloco.alturaMm} mm) · ${(params.percentDesperdicio * 100).toFixed(0)}% desperdício.`,
      artigos: [
        {
          descricao: `Bloco ICF ${params.bloco.codigo}`,
          unidade: "un",
          quantidade: t.blocos_com_desperdicio,
          preco_unitario: FALLBACK_PRICES.bloco_un,
          article_code: "ICF_PLANTA_BLOCO",
        },
      ],
    });
  }

  // Betão
  if (t.volume_betao_total_m3 > 0) {
    chapters.push({
      titulo: "Betão estrutural",
      descricao: `Paredes ${t.volume_betao_paredes_m3} m³ · Fundações ${t.volume_betao_fundacoes_m3} m³ · Lajes ${t.volume_betao_lajes_m3} m³.`,
      artigos: [
        ...(t.volume_betao_paredes_m3 > 0
          ? [
              {
                descricao: "Betão para enchimento ICF (paredes)",
                unidade: "m³",
                quantidade: t.volume_betao_paredes_m3,
                preco_unitario: FALLBACK_PRICES.betao_m3,
                article_code: "ICF_PLANTA_BETAO_PAREDES",
              },
            ]
          : []),
        ...(t.volume_betao_fundacoes_m3 > 0
          ? [
              {
                descricao: "Betão para fundações",
                unidade: "m³",
                quantidade: t.volume_betao_fundacoes_m3,
                preco_unitario: FALLBACK_PRICES.betao_m3,
                article_code: "ICF_PLANTA_BETAO_FUND",
              },
            ]
          : []),
        ...(t.volume_betao_lajes_m3 > 0
          ? [
              {
                descricao: "Betão para lajes",
                unidade: "m³",
                quantidade: t.volume_betao_lajes_m3,
                preco_unitario: FALLBACK_PRICES.betao_m3,
                article_code: "ICF_PLANTA_BETAO_LAJES",
              },
            ]
          : []),
      ],
    });
  }

  // Armadura
  if (t.armadura_kg > 0) {
    chapters.push({
      titulo: "Armadura",
      descricao: `Estimativa a ${params.kgArmaduraPorM3} kg/m³ sobre ${t.volume_betao_total_m3} m³.`,
      artigos: [
        {
          descricao: "Aço para armaduras (estimativa global)",
          unidade: "kg",
          quantidade: t.armadura_kg,
          preco_unitario: FALLBACK_PRICES.aco_kg,
          article_code: "ICF_PLANTA_ARMADURA",
        },
      ],
    });
  }

  // Mão de obra (sobre área líquida total)
  if (t.area_liquida_m2 > 0) {
    chapters.push({
      titulo: "Mão de obra ICF",
      descricao: "Montagem de painéis, escoramento e betonagem.",
      artigos: [
        {
          descricao: "Mão de obra — montagem de painéis ICF",
          unidade: "m²",
          quantidade: t.area_liquida_m2,
          preco_unitario: FALLBACK_PRICES.mao_obra_m2,
          article_code: "ICF_PLANTA_MO",
        },
      ],
    });
  }

  // Observações
  if (t.paredes_revisao > 0 || q.avisos.length > 0) {
    const obs = [
      t.paredes_revisao > 0
        ? `${t.paredes_revisao} parede(s) marcadas para rever no momento da geração.`
        : null,
      ...q.avisos,
    ]
      .filter(Boolean)
      .join(" | ");
    chapters.push({
      titulo: "Observações da análise",
      descricao: obs,
      artigos: [],
    });
  }

  return chapters;
}

function round(n: number, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

interface PlanToBudgetParams {
  result: IcfPlantAnalysisResult;
  quantities: IcfUnifiedQuantities;
  params: IcfUnifiedParams;
  obraId?: string | null;
  mode: "new" | "append";
  /** Quando mode='new': título do orçamento. Quando 'append': ignorado. */
  titulo?: string;
  /** Quando mode='append': orçamento alvo. */
  targetOrcamentoId?: string;
}

export function useIcfPlanToBudget() {
  const { user, organization } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (p: PlanToBudgetParams) => {
      if (!user?.id) throw new Error("Utilizador não autenticado.");
      if (!organization?.id) throw new Error("Organização não encontrada.");
      if (p.mode === "append" && !p.targetOrcamentoId) {
        throw new Error("Selecione o orçamento de destino.");
      }

      const chapters = buildIcfPlanChapters(p.quantities, p.params);
      if (chapters.length === 0) {
        throw new Error("Sem quantitativos consolidados para enviar.");
      }

      const versionId = p.result.__plan_analysis_version_id ?? null;

      let orcamentoId: string;
      let baseOrdem = 0;

      if (p.mode === "new") {
        const titulo =
          p.titulo?.trim() ||
          `Orçamento ICF — análise ${p.quantities.origem.toUpperCase()} ${new Date().toLocaleDateString("pt-PT")}`;
        const { data: orc, error: orcErr } = await supabase
          .from("orcamentos")
          .insert({
            user_id: user.id,
            obra_id: p.obraId ?? null,
            titulo,
            status: "rascunho",
            custos_indiretos: { estaleiro: 0, seguros: 0, licenciamento: 0 } as any,
          } as any)
          .select("id")
          .single();
        if (orcErr) throw orcErr;
        orcamentoId = (orc as any).id;
      } else {
        orcamentoId = p.targetOrcamentoId!;
        const { data: lastCap } = await supabase
          .from("capitulos_orcamento")
          .select("ordem")
          .eq("orcamento_id", orcamentoId)
          .order("ordem", { ascending: false })
          .limit(1)
          .maybeSingle();
        baseOrdem = ((lastCap as any)?.ordem ?? 0) as number;
      }

      // Inserir capítulos + artigos sequencialmente para manter ordem.
      let chapterCount = 0;
      let articleCount = 0;
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        const ordem = baseOrdem + i + 1;
        const { data: cap, error: capErr } = await supabase
          .from("capitulos_orcamento")
          .insert({
            orcamento_id: orcamentoId,
            numero: ordem,
            titulo: ch.titulo,
            descricao: ch.descricao ?? null,
            ordem,
          } as any)
          .select("id")
          .single();
        if (capErr) throw capErr;
        chapterCount++;

        if (ch.artigos.length > 0) {
          const rows = ch.artigos.map((a, idx) => ({
            capitulo_id: (cap as any).id,
            descricao: a.descricao,
            unidade: a.unidade,
            quantidade: a.quantidade,
            preco_unitario: a.preco_unitario,
            preco_base: a.preco_unitario,
            ordem: idx + 1,
            source: "axia_icf_planta",
            linked_element_id: versionId ?? null,
            chapter_code: "ICF_PLANTA",
            article_code: a.article_code,
            quantity_source: "calculado",
          }));
          const { error: artErr } = await supabase
            .from("artigos_orcamento")
            .insert(rows as any);
          if (artErr) throw artErr;
          articleCount += rows.length;
        }
      }

      // Auditoria (best-effort)
      const planImportId = p.result.__plan_import_id ?? null;
      if (planImportId) {
        try {
          await supabase.from("plan_analysis_logs").insert({
            plan_import_id: planImportId,
            plan_analysis_version_id: versionId,
            organization_id: organization.id,
            obra_id: p.obraId ?? null,
            event_type:
              p.mode === "new" ? "orcamento_criado" : "orcamento_atualizado",
            status: "success",
            message:
              p.mode === "new"
                ? `Novo orçamento criado com ${chapterCount} capítulo(s) e ${articleCount} artigo(s).`
                : `Adicionados ${chapterCount} capítulo(s) e ${articleCount} artigo(s) ao orçamento existente.`,
            metadata: {
              orcamento_id: orcamentoId,
              chapters: chapterCount,
              articles: articleCount,
              totais: p.quantities.totais,
            },
          } as any);
        } catch (e) {
          console.warn("plan_analysis_logs insert falhou:", e);
        }
      }

      return { orcamentoId, chapterCount, articleCount, mode: p.mode };
    },
    onSuccess: ({ orcamentoId, chapterCount, articleCount, mode }) => {
      qc.invalidateQueries({ queryKey: ["orcamentos"] });
      qc.invalidateQueries({ queryKey: ["orcamento", orcamentoId] });
      toast({
        title:
          mode === "new"
            ? "Orçamento criado a partir da planta"
            : "Capítulos adicionados ao orçamento",
        description: `${chapterCount} capítulo(s) · ${articleCount} artigo(s).`,
      });
    },
    onError: (e: any) => {
      toast({
        title: "Erro a enviar para orçamento",
        description: e?.message || "Falha desconhecida.",
        variant: "destructive",
      });
    },
  });
}
