import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
}

interface AnalyzeParams {
  filePath: string;
  obraId: string;
  configuracaoId: string;
  empresaId: string;
  espessuraNucleo: number;
  classeBetao: string;
  classeAco: string;
}

export function useIcfPlantAnalysis() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [analysisResult, setAnalysisResult] = useState<IcfPlantAnalysisResult | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async (params: AnalyzeParams): Promise<IcfPlantAnalysisResult> => {
      const { data, error } = await supabase.functions.invoke('icf-plant-analysis', {
        body: {
          file_path: params.filePath,
          obra_id: params.obraId,
          configuracao_id: params.configuracaoId,
          espessura_nucleo: params.espessuraNucleo,
          classe_betao: params.classeBetao,
          classe_aco: params.classeAco,
        },
      });

      if (error) throw new Error(error.message || 'Erro na análise');
      if (data?.error) throw new Error(data.error);
      return data.data as IcfPlantAnalysisResult;
    },
    onSuccess: (result) => {
      setAnalysisResult(result);
      toast({
        title: 'Análise concluída',
        description: `Encontrados: ${result.paredes.length} paredes, ${result.fundacoes.length} fundações, ${result.lajes.length} lajes`,
      });
    },
    onError: (e: any) => {
      toast({ title: 'Erro na análise', description: e.message, variant: 'destructive' });
    },
  });

  const createRecordsMutation = useMutation({
    mutationFn: async (params: {
      result: IcfPlantAnalysisResult;
      obraId: string;
      configuracaoId: string;
      empresaId: string;
      espessuraNucleo: number;
    }) => {
      const { result, obraId, configuracaoId, empresaId, espessuraNucleo } = params;

      // Create paredes
      for (let i = 0; i < result.paredes.length; i++) {
        const p = result.paredes[i];
        const vaosArea = (p.vaos || []).reduce((sum, v) => sum + v.largura * v.altura * v.quantidade, 0);

        // Build insert payload explicitly — area_bruta is GENERATED ALWAYS, must not be included
        const panoPayload: Record<string, unknown> = {
          empresa_id: empresaId,
          obra_id: obraId,
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
          observacoes: 'Gerado por Axia™ — análise de planta',
        };

        const { data: pano, error: panoErr } = await supabase
          .from('icf_panos_parede')
          .insert(panoPayload as any)
          .select()
          .single();
        if (panoErr) throw panoErr;

        // Create vãos for this pano
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
      }

      // Create fundações
      if (result.fundacoes.length > 0) {
        const fundInsert = result.fundacoes.map(f => ({
          empresa_id: empresaId,
          obra_id: obraId,
          configuracao_id: configuracaoId,
          tipo_fundacao: f.tipo_fundacao,
          referencia: f.referencia || null,
          comprimento: f.comprimento,
          largura: f.largura,
          altura: f.altura,
          quantidade: f.quantidade,
          volume_betao: f.comprimento * f.largura * f.altura * f.quantidade,
          observacoes: 'Gerado por Axia™ — análise de planta',
        }));
        const { error: fundErr } = await supabase.from('icf_fundacoes').insert(fundInsert as any);
        if (fundErr) throw fundErr;
      }

      // Create lajes
      if (result.lajes.length > 0) {
        const lajesInsert = result.lajes.map(l => ({
          empresa_id: empresaId,
          obra_id: obraId,
          configuracao_id: configuracaoId,
          referencia: l.referencia || null,
          piso: l.piso || null,
          tipologia_laje: l.tipologia_laje || null,
          area: l.area,
          espessura_total: l.espessura_total,
          volume: l.area * l.espessura_total,
          observacoes: 'Gerado por Axia™ — análise de planta',
        }));
        const { error: lajeErr } = await supabase.from('icf_lajes').insert(lajesInsert as any);
        if (lajeErr) throw lajeErr;
      }
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ['icf-panos', params.configuracaoId] });
      qc.invalidateQueries({ queryKey: ['icf-fundacoes', params.configuracaoId] });
      qc.invalidateQueries({ queryKey: ['icf-lajes', params.configuracaoId] });
      qc.invalidateQueries({ queryKey: ['icf-resumo', params.configuracaoId] });
      setAnalysisResult(null);
      toast({
        title: 'Dados ICF criados com sucesso',
        description: `${params.result.paredes.length} paredes, ${params.result.fundacoes.length} fundações e ${params.result.lajes.length} lajes criadas.`,
      });
    },
    onError: (e: any) => {
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
