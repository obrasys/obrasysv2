import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PLAN_MESSAGES, humanizeError } from '@/lib/plan-error-messages';


interface ExtractedVao {
  tipo_vao: string;
  largura: number;
  altura: number;
  quantidade: number;
}

interface ExtractedParede {
  referencia: string;
  comprimento: number;
  altura_util: number;
  espessura_nucleo: number;
  piso_inicial?: string;
  piso_final?: string;
  vaos?: ExtractedVao[];
  // Lote 2.3: rastreabilidade da medição vinda da Axia
  confianca?: number;
  metodo_medicao?: 'cota' | 'escala' | 'estimativa_visual' | string;
  notas_validacao?: string;
}

interface ExtractedFundacao {
  tipo_fundacao: 'sapata_continua' | 'sapata_isolada' | 'outra';
  referencia?: string;
  comprimento: number;
  largura: number;
  altura: number;
  quantidade: number;
}

interface ExtractedLaje {
  referencia?: string;
  piso?: string;
  tipologia_laje?: string;
  area: number;
  espessura_total: number;
}

export interface IcfPlantAnalysisResult {
  paredes: ExtractedParede[];
  fundacoes: ExtractedFundacao[];
  lajes: ExtractedLaje[];
  notas?: string;
  // Lote 2.5: identificadores devolvidos pela edge function para rastreabilidade
  __plan_import_id?: string | null;
  __plan_analysis_version_id?: string | null;
  // Fase 4/5: origem e confirmação de escala (DXF)
  __source?: 'dxf' | 'ai';
  __file_path?: string;
  __requires_unit_confirmation?: boolean;
  __detected_unit?: string | null;
  __sanity_warnings?: Array<{ code: string; message: string; severity: string }>;
}

/** Lote 2.3 — diagnóstico de "dados em falta" sobre um resultado da Axia. */
export function diagnoseMissingData(result: IcfPlantAnalysisResult | null): {
  needsReview: boolean;
  reasons: string[];
} {
  if (!result) return { needsReview: false, reasons: [] };
  const reasons: string[] = [];
  if (result.paredes.length === 0) {
    reasons.push('A Axia não conseguiu extrair paredes desta planta.');
  }
  const semAltura = result.paredes.filter((p) => !p.altura_util || p.altura_util < 1.5);
  if (semAltura.length > 0) {
    reasons.push(`${semAltura.length} parede(s) sem altura legível.`);
  }
  const baixaConfianca = result.paredes.filter(
    (p) => typeof p.confianca === 'number' && p.confianca < 0.6,
  );
  if (baixaConfianca.length > 0) {
    reasons.push(`${baixaConfianca.length} parede(s) com confiança < 60%.`);
  }
  const semEscala = result.paredes.filter(
    (p) => p.metodo_medicao === 'estimativa_visual' || /sem escala|indispon/i.test(p.notas_validacao || ''),
  );
  if (semEscala.length > 0) {
    reasons.push(`${semEscala.length} parede(s) sem escala/cota fiável.`);
  }
  return { needsReview: reasons.length > 0, reasons };
}


interface AnalyzeParams {
  filePath: string;
  obraId?: string | null;
  configuracaoId: string;
  espessuraNucleo: number;
  classeBetao: string;
  classeAco: string;
  // Fase 5: override explícito da unidade DXF (mm/cm/m/in/dm)
  unitOverride?: 'mm' | 'cm' | 'm' | 'in' | 'dm' | null;
}

export function useIcfPlantAnalysis() {
  const { toast } = useToast();
  const { organization } = useAuth();
  const qc = useQueryClient();
  const [analysisResult, setAnalysisResult] = useState<IcfPlantAnalysisResult | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async (params: AnalyzeParams): Promise<IcfPlantAnalysisResult> => {
      // Fase 4: DXF é processado por parser vetorial determinístico, sem IA visual.
      const isDxf = /\.dxf$/i.test(params.filePath);
      const fnName = isDxf ? 'plan-dxf-parse' : 'icf-plant-analysis';
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: {
          file_path: params.filePath,
          obra_id: params.obraId || null,
          configuracao_id: params.configuracaoId,
          espessura_nucleo: params.espessuraNucleo,
          classe_betao: params.classeBetao,
          classe_aco: params.classeAco,
          // Fase 5: enviado apenas para DXF; ignorado pelo icf-plant-analysis
          ...(isDxf && params.unitOverride ? { unit_override: params.unitOverride } : {}),
        },
      });

      if (error) throw new Error(error.message || 'Erro na análise');
      if (data?.error) throw new Error(data.error);
      const audit = data.audit ?? {};
      return {
        ...(data.data as IcfPlantAnalysisResult),
        __audit: audit,
        __source: isDxf ? 'dxf' : 'ai',
        __file_path: params.filePath,
        __plan_import_id: data.plan_import_id ?? null,
        __plan_analysis_version_id: data.plan_analysis_version_id ?? null,
        __requires_unit_confirmation: !!audit.requires_unit_confirmation,
        __detected_unit: audit.unidade_dxf ?? null,
        __sanity_warnings: Array.isArray(audit.sanity_warnings) ? audit.sanity_warnings : [],
      } as IcfPlantAnalysisResult & { __audit?: any };
    },
    onSuccess: (result: any) => {
      setAnalysisResult(result);
      const audit = result?.__audit;
      if (audit?.requer_revisao_humana) {
        toast({
          title: 'Revisão humana recomendada',
          description: 'A Axia detetou possível duplicação ou baixa confiança na leitura da planta. Revise as paredes extraídas antes de gerar orçamento.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Análise concluída',
          description: `Encontrados: ${result.paredes.length} paredes, ${result.fundacoes.length} fundações, ${result.lajes.length} lajes`,
        });
      }
    },
    onError: (e: any) => {
      toast({ title: 'Erro na análise', description: e.message, variant: 'destructive' });
    },
  });

  const createRecordsMutation = useMutation({
    mutationFn: async (params: {
      result: IcfPlantAnalysisResult;
      obraId: string | null;
      configuracaoId: string;
      espessuraNucleo: number;
    }) => {
      const { result, obraId, configuracaoId, espessuraNucleo } = params;
      const empresaId = organization?.id;

      if (!empresaId) {
        throw new Error('Organização não encontrada para criar os registos ICF.');
      }

      // Espelho em icf_wall_panels só é criado quando há obra (coluna NOT NULL).
      const thicknessMm = Math.round((espessuraNucleo || 0.15) * 1000) + 130;
      const wallPanelsPayload: Record<string, unknown>[] = [];

      for (let i = 0; i < result.paredes.length; i++) {
        const p = result.paredes[i];
        const vaosArea = (p.vaos || []).reduce((sum, v) => sum + v.largura * v.altura * v.quantidade, 0);

        const confianca = typeof p.confianca === 'number' ? p.confianca : null;
        const requiresReview = confianca !== null
          ? confianca < 0.6
          : !!(p.notas_validacao && /indispon|estim|inferid/i.test(p.notas_validacao));

        const panoPayload: Record<string, unknown> = {
          empresa_id: empresaId,
          obra_id: obraId ?? null,
          configuracao_id: configuracaoId,
          referencia: p.referencia,
          piso_inicial: p.piso_inicial || null,
          piso_final: p.piso_final || null,
          altura_util: p.altura_util,
          comprimento: p.comprimento,
          espessura_nucleo: p.espessura_nucleo || espessuraNucleo,
          area_vaos: vaosArea,
          fator_cumprimento: 1,
          ordem: i + 1,
          observacoes: 'Gerado por Axia™ - análise de planta',
          // Lote 2.3: propagar metadados de qualidade da leitura
          confidence: confianca,
          requires_review: requiresReview,
          metodo_medicao: p.metodo_medicao ?? null,
          notas_validacao: p.notas_validacao ?? null,
        };

        const { data: pano, error: panoErr } = await supabase
          .from('icf_panos_parede')
          .insert(panoPayload as any)
          .select()
          .single();
        if (panoErr) throw panoErr;

        if (p.vaos && p.vaos.length > 0 && pano) {
          const vaosInsert = p.vaos.map(v => ({
            empresa_id: empresaId,
            pano_id: pano.id,
            tipo_vao: v.tipo_vao,
            largura: v.largura,
            altura: v.altura,
            quantidade: v.quantidade,
            area_total: v.largura * v.altura * v.quantidade,
          }));
          const { error: vaosErr } = await supabase.from('icf_vaos').insert(vaosInsert as any);
          if (vaosErr) throw vaosErr;
        }

        if (obraId) {
          wallPanelsPayload.push({
            empresa_id: empresaId,
            obra_id: obraId,
            configuracao_id: configuracaoId,
            label: p.referencia || `Pano ${i + 1}`,
            floor: p.piso_inicial || null,
            room: null,
            length_m: p.comprimento,
            height_m: p.altura_util,
            thickness_mm: thicknessMm,
            selected_block_code: 'HB-BLOCO-220',
            openings: (p.vaos || []).map(v => ({
              type: (v.tipo_vao || '').toLowerCase().includes('porta') ? 'porta' : 'janela',
              width_m: v.largura,
              height_m: v.altura,
            })),
            status: 'rascunho',
            source: 'axia',
            notes: 'Gerado por Axia™ - análise de planta',
          });
        }
      }

      if (wallPanelsPayload.length > 0) {
        const { error: wpErr } = await supabase
          .from('icf_wall_panels' as any)
          .insert(wallPanelsPayload as any);
        if (wpErr) throw wpErr;
      }

      if (result.fundacoes.length > 0) {
        const fundInsert = result.fundacoes.map(f => ({
          empresa_id: empresaId,
          obra_id: obraId ?? null,
          configuracao_id: configuracaoId,
          tipo_fundacao: f.tipo_fundacao,
          referencia: f.referencia || null,
          comprimento: f.comprimento,
          largura: f.largura,
          altura: f.altura,
          quantidade: f.quantidade,
          volume_betao: f.comprimento * f.largura * f.altura * f.quantidade,
          observacoes: 'Gerado por Axia™ - análise de planta',
        }));
        const { error: fundErr } = await supabase.from('icf_fundacoes').insert(fundInsert as any);
        if (fundErr) throw fundErr;
      }

      if (result.lajes.length > 0) {
        const lajesInsert = result.lajes.map(l => ({
          empresa_id: empresaId,
          obra_id: obraId ?? null,
          configuracao_id: configuracaoId,
          referencia: l.referencia || null,
          piso: l.piso || null,
          tipologia_laje: l.tipologia_laje || null,
          area: l.area,
          espessura_total: l.espessura_total,
          volume: l.area * l.espessura_total,
          observacoes: 'Gerado por Axia™ - análise de planta',
        }));
        const { error: lajeErr } = await supabase.from('icf_lajes').insert(lajesInsert as any);
        if (lajeErr) throw lajeErr;
      }
    },
    onSuccess: async (_, params) => {
      qc.invalidateQueries({ queryKey: ['icf-panos', params.configuracaoId] });
      qc.invalidateQueries({ queryKey: ['icf-fundacoes', params.configuracaoId] });
      qc.invalidateQueries({ queryKey: ['icf-lajes', params.configuracaoId] });
      qc.invalidateQueries({ queryKey: ['icf-resumo', params.configuracaoId] });
      qc.invalidateQueries({ queryKey: ['icf-wall-panels', params.obraId] });

      // Lote 2.5: registar evento de validação humana / persistência
      const orgId = organization?.id;
      const planImportId = params.result.__plan_import_id ?? null;
      const versionId = params.result.__plan_analysis_version_id ?? null;
      if (orgId && planImportId) {
        try {
          await supabase.from('plan_analysis_logs').insert({
            plan_import_id: planImportId,
            plan_analysis_version_id: versionId,
            organization_id: orgId,
            obra_id: params.obraId ?? null,
            event_type: 'dados_validados',
            status: 'success',
            message: `Registos ICF criados: ${params.result.paredes.length} paredes`,
            metadata: {
              paredes: params.result.paredes.length,
              fundacoes: params.result.fundacoes.length,
              lajes: params.result.lajes.length,
              configuracao_id: params.configuracaoId,
            },
          } as any);
          if (versionId) {
            await supabase
              .from('plan_analysis_versions')
              .update({ human_reviewed: true } as any)
              .eq('id', versionId);
          }
        } catch (err) {
          console.warn('plan_analysis_logs insert failed:', err);
        }
      }

      setAnalysisResult(null);
      toast({
        title: 'Dados ICF criados com sucesso',
        description: `${params.result.paredes.length} paredes, ${params.result.fundacoes.length} fundações e ${params.result.lajes.length} lajes criadas.`,
      });
    },
    onError: async (e: any, params) => {
      const orgId = organization?.id;
      const planImportId = params?.result.__plan_import_id ?? null;
      if (orgId && planImportId) {
        try {
          await supabase.from('plan_analysis_logs').insert({
            plan_import_id: planImportId,
            plan_analysis_version_id: params?.result.__plan_analysis_version_id ?? null,
            organization_id: orgId,
            obra_id: params?.obraId ?? null,
            event_type: 'erro_persistencia',
            status: 'error',
            message: (e?.message || 'Erro ao criar registos ICF').slice(0, 500),
          } as any);
        } catch {}
      }
      toast({ title: 'Erro ao criar registos', description: e.message, variant: 'destructive' });
    },
  });

  return {
    analyze: analyzeMutation.mutate,
    isAnalyzing: analyzeMutation.isPending,
    analysisResult,
    setAnalysisResult,
    createRecords: createRecordsMutation.mutate,
    isCreating: createRecordsMutation.isPending,
  };
}
