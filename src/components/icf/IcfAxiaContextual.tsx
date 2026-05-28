import { useMemo } from 'react';
import { AlertTriangle, Info, Lightbulb, CheckCircle2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { IcfPanoParede, IcfFundacao, IcfLaje, IcfResumo, IcfConfiguracao } from '@/types/icf';

interface Alert {
  type: 'warning' | 'info' | 'tip' | 'success';
  title: string;
  message: string;
  justification?: string;
}

interface IcfAxiaContextualProps {
  context: 'panos' | 'fundacoes' | 'lajes' | 'resumo';
  config?: IcfConfiguracao | null;
  panos?: IcfPanoParede[];
  fundacoes?: IcfFundacao[];
  lajes?: IcfLaje[];
  resumo?: IcfResumo | null;
}

function analyzePanos(panos: IcfPanoParede[], config?: IcfConfiguracao | null): Alert[] {
  const alerts: Alert[] = [];
  if (!panos.length) {
    alerts.push({
      type: 'info',
      title: 'Sem panos registados',
      message: 'Adicione panos de parede para iniciar o cálculo paramétrico ICF.',
      justification: 'O módulo necessita de pelo menos um pano para gerar volumes e quantidades.',
    });
    return alerts;
  }

  // Panos without reinforcement
  const noArm = panos.filter(p => !p.armadura_vertical && !p.armadura_horizontal);
  if (noArm.length > 0) {
    alerts.push({
      type: 'warning',
      title: `${noArm.length} pano(s) sem armadura definida`,
      message: `Panos: ${noArm.map(p => p.referencia).join(', ')}`,
      justification: 'Panos ICF sem armadura não permitem estimativa de aço, comprometendo o resumo global e o orçamento.',
    });
  }

  // High void ratio per pano
  panos.forEach(p => {
    if (p.area_bruta > 0 && (p.area_vaos ?? 0) / p.area_bruta > 0.4) {
      alerts.push({
        type: 'warning',
        title: `Vãos elevados - ${p.referencia}`,
        message: `${(((p.area_vaos ?? 0) / p.area_bruta) * 100).toFixed(0)}% de vãos na área bruta.`,
        justification: 'Acima de 40% de vãos pode comprometer a rigidez estrutural do pano ICF. Considere reforço localizado.',
      });
    }
  });

  // Panos with zero length
  const zeroLen = panos.filter(p => p.comprimento <= 0);
  if (zeroLen.length > 0) {
    alerts.push({
      type: 'warning',
      title: `${zeroLen.length} pano(s) com comprimento zero`,
      message: `Panos: ${zeroLen.map(p => p.referencia).join(', ')}`,
      justification: 'Panos sem comprimento resultam em volumes nulos, afetando o resumo e o orçamento.',
    });
  }

  // Panos without vãos - tip
  const noVaos = panos.filter(p => (p.area_vaos ?? 0) === 0 && p.area_bruta > 0);
  if (noVaos.length > 0 && noVaos.length < panos.length) {
    alerts.push({
      type: 'tip',
      title: `${noVaos.length} pano(s) sem vãos`,
      message: 'Verifique se estes panos são realmente cegos ou se faltam vãos por registar.',
      justification: 'A ausência de vãos em panos de fachada pode indicar dados incompletos.',
    });
  }

  // Different espessura values
  const espessuras = [...new Set(panos.map(p => p.espessura_nucleo))];
  if (espessuras.length > 1) {
    alerts.push({
      type: 'info',
      title: 'Espessuras de núcleo diferentes',
      message: `Foram detetadas ${espessuras.length} espessuras distintas: ${espessuras.map(e => `${(e * 100).toFixed(0)} cm`).join(', ')}.`,
      justification: 'Verifique se a variação é intencional ou se resulta de erro de introdução.',
    });
  }

  // All good
  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      title: 'Panos validados',
      message: `${panos.length} pano(s) sem incoerências detetadas.`,
    });
  }

  return alerts;
}

function analyzeFundacoes(fundacoes: IcfFundacao[]): Alert[] {
  const alerts: Alert[] = [];
  if (!fundacoes.length) {
    alerts.push({
      type: 'info',
      title: 'Sem fundações registadas',
      message: 'Adicione fundações para completar o resumo estrutural da obra ICF.',
    });
    return alerts;
  }

  // Without tensao
  const noTensao = fundacoes.filter(f => !f.tensao_admissivel_terreno);
  if (noTensao.length > 0) {
    alerts.push({
      type: 'warning',
      title: `${noTensao.length} fundação(ões) sem tensão admissível`,
      message: 'A tensão admissível do terreno é importante para validação paramétrica.',
      justification: 'Valor de referência ICF: 300 kPa (admissível) / 200 kPa (cálculo). Defina para controlo adequado.',
    });
  }

  // Without aco
  const noAco = fundacoes.filter(f => !f.aco_estimado_kg || f.aco_estimado_kg <= 0);
  if (noAco.length > 0) {
    alerts.push({
      type: 'tip',
      title: `${noAco.length} fundação(ões) sem aço estimado`,
      message: 'O aço das fundações não será contabilizado no resumo global.',
      justification: 'Introduza uma estimativa de kg de aço para que o índice kg/m² reflita a obra completa.',
    });
  }

  // Tension exceeding admissible
  fundacoes.forEach(f => {
    if (f.tensao_admissivel_terreno && f.tensao_calculo && f.tensao_calculo > f.tensao_admissivel_terreno) {
      alerts.push({
        type: 'warning',
        title: `Tensão excedida - ${f.referencia}`,
        message: `Tensão de cálculo (${f.tensao_calculo} kPa) supera a admissível (${f.tensao_admissivel_terreno} kPa).`,
        justification: 'Esta situação requer validação por engenheiro estrutural.',
      });
    }
  });

  if (alerts.length === 0) {
    alerts.push({ type: 'success', title: 'Fundações validadas', message: `${fundacoes.length} fundação(ões) sem incoerências.` });
  }

  return alerts;
}

function analyzeLajes(lajes: IcfLaje[]): Alert[] {
  const alerts: Alert[] = [];
  if (!lajes.length) {
    alerts.push({
      type: 'info',
      title: 'Sem lajes registadas',
      message: 'Adicione lajes para completar o resumo estrutural.',
    });
    return alerts;
  }

  // Without peso proprio
  const noPeso = lajes.filter(l => !l.peso_proprio_kn_m2);
  if (noPeso.length > 0) {
    alerts.push({
      type: 'tip',
      title: `${noPeso.length} laje(s) sem peso próprio`,
      message: 'O valor padrão para vigotas in situ é 2,53 kN/m².',
      justification: 'Sem peso próprio, a análise de cargas fica incompleta.',
    });
  }

  // Without aco
  const noAco = lajes.filter(l => !l.aco_estimado_kg || l.aco_estimado_kg <= 0);
  if (noAco.length > 0) {
    alerts.push({
      type: 'tip',
      title: `${noAco.length} laje(s) sem aço estimado`,
      message: 'O aço das lajes não será contabilizado no índice kg/m² global.',
    });
  }

  // Very thin slab
  lajes.forEach(l => {
    if (l.espessura_total > 0 && l.espessura_total < 0.12) {
      alerts.push({
        type: 'warning',
        title: `Espessura reduzida - ${l.referencia}`,
        message: `Espessura de ${(l.espessura_total * 100).toFixed(0)} cm. O mínimo recomendado para vigotas é 17 cm (9 cm abobadilha + 8 cm compressão).`,
        justification: 'Espessuras inferiores ao padrão podem não cumprir requisitos regulamentares.',
      });
    }
  });

  if (alerts.length === 0) {
    alerts.push({ type: 'success', title: 'Lajes validadas', message: `${lajes.length} laje(s) sem incoerências.` });
  }

  return alerts;
}

function analyzeResumo(resumo: IcfResumo | null, config?: IcfConfiguracao | null): Alert[] {
  const alerts: Alert[] = [];
  if (!resumo) {
    alerts.push({ type: 'info', title: 'Resumo indisponível', message: 'Adicione elementos (panos, fundações, lajes) para gerar o resumo.' });
    return alerts;
  }

  // m3/m2 index check
  if (resumo.indice_m3_m2 !== null && resumo.indice_m3_m2 !== undefined) {
    if (resumo.indice_m3_m2 > 0.25) {
      alerts.push({
        type: 'warning',
        title: 'Índice m³/m² elevado',
        message: `Valor atual: ${resumo.indice_m3_m2.toFixed(4)}. Valores típicos ICF situam-se entre 0,10–0,20.`,
        justification: 'Um índice elevado pode indicar excesso de betão ou áreas subestimadas.',
      });
    }
  }

  // kg/m2 index check
  if (resumo.indice_kg_m2 > 0) {
    if (resumo.indice_kg_m2 > 25) {
      alerts.push({
        type: 'warning',
        title: 'Índice kg/m² acima da referência',
        message: `Valor atual: ${resumo.indice_kg_m2.toFixed(2)} kg/m². Intervalo típico: 15–25 kg/m².`,
        justification: 'Pode indicar excesso de armadura ou panos com reforço desnecessário.',
      });
    } else if (resumo.indice_kg_m2 < 15) {
      alerts.push({
        type: 'info',
        title: 'Índice kg/m² abaixo da referência',
        message: `Valor atual: ${resumo.indice_kg_m2.toFixed(2)} kg/m². Pode indicar estimativas de aço em falta.`,
      });
    }
  }

  // Missing volumes
  if ((resumo.volume_total_fundacoes ?? 0) === 0) {
    alerts.push({ type: 'tip', title: 'Fundações sem volume', message: 'Sem fundações registadas, o resumo de betão está incompleto.' });
  }
  if ((resumo.volume_total_lajes ?? 0) === 0) {
    alerts.push({ type: 'tip', title: 'Lajes sem volume', message: 'Sem lajes registadas, o resumo de betão está incompleto.' });
  }

  // Config frozen
  if (config?.status === 'congelado') {
    alerts.push({
      type: 'info',
      title: 'Configuração congelada',
      message: 'Os parâmetros base estão bloqueados. Alterações nos elementos não mudam a configuração.',
    });
  }

  if (alerts.length === 0) {
    alerts.push({ type: 'success', title: 'Resumo consistente', message: 'Todos os elementos estão preenchidos e os índices dentro dos valores de referência.' });
  }

  return alerts;
}

export function IcfAxiaContextual({ context, config, panos, fundacoes, lajes, resumo }: IcfAxiaContextualProps) {
  const alerts = useMemo(() => {
    switch (context) {
      case 'panos': return analyzePanos(panos ?? [], config);
      case 'fundacoes': return analyzeFundacoes(fundacoes ?? []);
      case 'lajes': return analyzeLajes(lajes ?? []);
      case 'resumo': return analyzeResumo(resumo ?? null, config);
      default: return [];
    }
  }, [context, panos, fundacoes, lajes, resumo, config]);

  if (alerts.length === 0) return null;

  const iconMap = {
    warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
    info: <Info className="h-4 w-4 text-primary shrink-0" />,
    tip: <Lightbulb className="h-4 w-4 text-blue-400 shrink-0" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
  };

  const borderMap = {
    warning: 'border-amber-500/30 bg-amber-500/5',
    info: 'border-primary/20 bg-primary/5',
    tip: 'border-blue-400/20 bg-blue-400/5',
    success: 'border-emerald-500/20 bg-emerald-500/5',
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Axia™ - Análise Contextual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((a, i) => (
          <div key={i} className={`flex gap-3 p-3 rounded-lg border text-sm ${borderMap[a.type]}`}>
            {iconMap[a.type]}
            <div className="flex-1 min-w-0">
              <p className="font-medium">{a.title}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{a.message}</p>
              {a.justification && (
                <p className="text-xs mt-1 text-muted-foreground/80 italic">
                  Justificação: {a.justification}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
