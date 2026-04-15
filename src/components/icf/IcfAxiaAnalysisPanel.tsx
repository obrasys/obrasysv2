import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, Sparkles, AlertTriangle, Lightbulb, Zap, Loader2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIcfPanos, useIcfFundacoes, useIcfLajes, useIcfResumo, useIcfConfiguracao } from '@/hooks/useIcfData';
import ReactMarkdown from 'react-markdown';

type AnalysisType = 'global' | 'structural' | 'alerts' | 'optimization';

interface Props {
  configId: string;
}

const prompts: Record<AnalysisType, string> = {
  global: `És a Axia™, assistente técnica de construção ICF no Obra Sys.
Faz uma análise global completa desta configuração ICF. Avalia:
- Coerência dos panos de parede (áreas, vãos, armaduras)
- Estado das fundações (volumes, tensões, aço)
- Estado das lajes (áreas, volumes, peso próprio)
- Índices globais (m³/m², kg/m²) e se estão dentro de referências ICF
- Resumo executivo com pontos fortes e fracos
Responde em português, formato estruturado com emojis, claro e técnico.`,

  structural: `És a Axia™, assistente técnica de construção ICF.
Faz uma análise estrutural paramétrica dos dados ICF fornecidos. Foca em:
- Volumes de betão por pano vs referências ICF (0.15m núcleo, C30/37)
- Relação vãos/área bruta por pano (alerta acima de 40%)
- Armaduras definidas vs tipologia (padrão: 2×Ø10/20 vert + 2×Ø8/20 horiz)
- Fundações: dimensões vs presets (contínua 0.70×0.45, isolada 0.70×0.70)
- Lajes: espessura mínima 17cm (9cm abobadilha + 8cm compressão)
Nunca faz dimensionamento estrutural. Faz leitura paramétrica construtiva.
Responde em português, formato técnico com emojis.`,

  alerts: `És a Axia™, assistente técnica de construção ICF.
Identifica TODOS os problemas, incoerências e dados em falta nesta configuração ICF:
- Panos sem armadura
- Panos com comprimento ou altura zero
- Panos com rácio de vãos acima de 40%
- Fundações sem tensão admissível
- Fundações com tensão de cálculo > admissível
- Lajes sem peso próprio ou com espessura < 17cm
- Aço não estimado em fundações ou lajes
- Índices fora dos intervalos de referência
Para cada problema: descreve, justifica e sugere ação corretiva.
Responde em português, formato lista com prioridade (🔴 crítico, 🟡 atenção, 🔵 informativo).`,

  optimization: `És a Axia™, assistente técnica de construção ICF.
Com base nos dados ICF fornecidos, sugere otimizações para:
- Redução de consumo de betão mantendo integridade
- Otimização de armaduras (verificar se reforço é necessário)
- Fundações: verificar se dimensões podem ser otimizadas
- Lajes: validar tipologia vs área
- Sugestões para melhorar índice m³/m² e kg/m²
- Recomendações para orçamentação mais precisa
Nunca sugere alterações que comprometam segurança estrutural.
Responde em português, formato prático com ações concretas e emojis.`,
};

export function IcfAxiaAnalysisPanel({ configId }: Props) {
  const { data: config } = useIcfConfiguracao(configId);
  const { data: panos } = useIcfPanos(configId);
  const { data: fundacoes } = useIcfFundacoes(configId);
  const { data: lajes } = useIcfLajes(configId);
  const { data: resumo } = useIcfResumo(configId);

  const [analysisType, setAnalysisType] = useState<AnalysisType | null>(null);
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const buildContext = () => {
    const lines: string[] = [];

    if (config) {
      lines.push(`CONFIGURAÇÃO: ${config.nome} | v${config.versao} | ${config.classe_betao} | ${config.classe_aco} | Núcleo: ${config.espessura_nucleo}m | Status: ${config.status}`);
    }

    if (panos?.length) {
      lines.push(`\nPANOS DE PAREDE (${panos.length}):`);
      panos.forEach(p => {
        lines.push(`  ${p.referencia}: comp=${p.comprimento}m alt=${p.altura_util}m espessura=${p.espessura_nucleo}m | A.bruta=${p.area_bruta?.toFixed(2)}m² A.vãos=${(p.area_vaos ?? 0).toFixed(2)}m² A.líq=${p.area_liquida?.toFixed(2)}m² Vol=${p.volume_betao?.toFixed(3)}m³ | Arm.vert=${p.armadura_vertical || 'N/D'} Arm.horiz=${p.armadura_horizontal || 'N/D'} Tipo=${p.tipo_armadura || 'N/D'}`);
      });
    } else {
      lines.push('\nPANOS DE PAREDE: Nenhum registado');
    }

    if (fundacoes?.length) {
      lines.push(`\nFUNDAÇÕES (${fundacoes.length}):`);
      fundacoes.forEach(f => {
        lines.push(`  ${f.referencia}: tipo=${f.tipo_fundacao} comp=${f.comprimento}m larg=${f.largura}m alt=${f.altura}m qtd=${f.quantidade} | Vol=${f.volume_betao?.toFixed(3)}m³ Aço=${f.aco_estimado_kg ?? 'N/D'}kg | T.adm=${f.tensao_admissivel_terreno ?? 'N/D'}kPa T.calc=${f.tensao_calculo ?? 'N/D'}kPa`);
      });
    } else {
      lines.push('\nFUNDAÇÕES: Nenhuma registada');
    }

    if (lajes?.length) {
      lines.push(`\nLAJES (${lajes.length}):`);
      lajes.forEach(l => {
        lines.push(`  ${l.referencia}: piso=${l.piso} área=${l.area}m² espessura=${l.espessura_total}m | Vol=${l.volume?.toFixed(3)}m³ Aço=${l.aco_estimado_kg ?? 'N/D'}kg PP=${l.peso_proprio_kn_m2 ?? 'N/D'}kN/m²`);
      });
    } else {
      lines.push('\nLAJES: Nenhuma registada');
    }

    if (resumo) {
      lines.push(`\nRESUMO GLOBAL:`);
      lines.push(`  Comp. total paredes: ${resumo.comprimento_total_paredes?.toFixed(2)}m`);
      lines.push(`  Área líquida total: ${resumo.area_liquida_total?.toFixed(2)}m²`);
      lines.push(`  Área vãos total: ${resumo.area_total_vaos?.toFixed(2)}m²`);
      lines.push(`  Vol. betão paredes: ${resumo.volume_total_paredes?.toFixed(3)}m³`);
      lines.push(`  Vol. betão fundações: ${resumo.volume_total_fundacoes?.toFixed(3)}m³`);
      lines.push(`  Vol. betão lajes: ${resumo.volume_total_lajes?.toFixed(3)}m³`);
      lines.push(`  Vol. betão total: ${resumo.volume_total_obra?.toFixed(3)}m³`);
      lines.push(`  Índice m³/m²: ${resumo.indice_m3_m2?.toFixed(4)}`);
      lines.push(`  Índice kg/m²: ${resumo.indice_kg_m2?.toFixed(2)}`);
    }

    return lines.join('\n');
  };

  const runAnalysis = async (type: AnalysisType) => {
    setAnalysisType(type);
    setResponse('');
    setIsStreaming(true);

    const context = buildContext();
    const prompt = `${prompts[type]}\n\nDADOS ICF DA OBRA:\n${context}`;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(`${supabaseUrl}/functions/v1/axia-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: prompt, history: [] }),
      });

      if (!resp.ok || !resp.body) throw new Error('Erro na análise');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setResponse(accumulated);
            }
          } catch { /* partial */ }
        }
      }
    } catch (err) {
      setResponse('❌ Erro ao processar análise. Tente novamente.');
      console.error(err);
    } finally {
      setIsStreaming(false);
    }
  };

  const analysisButtons: { type: AnalysisType; icon: React.ReactNode; label: string; desc: string }[] = [
    { type: 'global', icon: <Sparkles className="h-3.5 w-3.5" />, label: 'Análise Global', desc: 'Visão completa da obra ICF' },
    { type: 'structural', icon: <BrainCircuit className="h-3.5 w-3.5" />, label: 'Análise Estrutural', desc: 'Volumes, armaduras e índices' },
    { type: 'alerts', icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Detetar Problemas', desc: 'Incoerências e dados em falta' },
    { type: 'optimization', icon: <Lightbulb className="h-3.5 w-3.5" />, label: 'Otimizações', desc: 'Sugestões de melhoria' },
  ];

  const stats = {
    panos: panos?.length ?? 0,
    fundacoes: fundacoes?.length ?? 0,
    lajes: lajes?.length ?? 0,
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-primary" />
          <span className="text-primary font-bold">Axia™</span>
          <span className="text-muted-foreground font-normal">· Análise ICF</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick stats */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[10px]">
            {stats.panos} panos
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {stats.fundacoes} fundações
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {stats.lajes} lajes
          </Badge>
          {config && (
            <Badge variant="outline" className="text-[10px]">
              {config.status}
            </Badge>
          )}
        </div>

        {/* Analysis buttons */}
        <div className="grid grid-cols-2 gap-2">
          {analysisButtons.map(btn => (
            <Button
              key={btn.type}
              variant={analysisType === btn.type ? 'default' : 'outline'}
              size="sm"
              className="h-auto py-2 px-3 flex flex-col items-start gap-0.5 text-left"
              disabled={isStreaming}
              onClick={() => runAnalysis(btn.type)}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium">
                {btn.icon}{btn.label}
              </span>
              <span className="text-[10px] font-normal opacity-70">{btn.desc}</span>
            </Button>
          ))}
        </div>

        {/* Response area */}
        {(response || isStreaming) && (
          <div className="rounded-lg border bg-card p-4 max-h-[50vh] overflow-y-auto">
            {isStreaming && !response && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                A analisar dados ICF...
              </div>
            )}
            {response && (
              <div className="prose prose-sm max-w-none text-sm dark:prose-invert">
                <ReactMarkdown>{response}</ReactMarkdown>
              </div>
            )}
            {isStreaming && response && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                A processar...
              </div>
            )}
          </div>
        )}

        {/* Reset */}
        {response && !isStreaming && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => { setResponse(''); setAnalysisType(null); }}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Limpar análise
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
