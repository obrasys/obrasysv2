import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIcfPanos, useIcfFundacoes, useIcfLajes, useIcfResumo, useIcfConfiguracao } from '@/hooks/useIcfData';

interface Props {
  configId: string;
}

interface Alert {
  type: 'warning' | 'info' | 'error';
  title: string;
  message: string;
}

export function IcfAxiaAlerts({ configId }: Props) {
  const { data: config } = useIcfConfiguracao(configId);
  const { data: panos } = useIcfPanos(configId);
  const { data: fundacoes } = useIcfFundacoes(configId);
  const { data: lajes } = useIcfLajes(configId);
  const { data: resumo } = useIcfResumo(configId);

  const alerts: Alert[] = [];

  // Check panos without reinforcement
  if (panos) {
    const noArm = panos.filter(p => !p.armadura_vertical && !p.armadura_horizontal);
    if (noArm.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Panos sem armadura definida',
        message: `${noArm.length} pano(s) não têm armadura definida: ${noArm.map(p => p.referencia).join(', ')}. Verifique a tipologia de armadura.`,
      });
    }

    // Check high void ratio
    panos.forEach(p => {
      if (p.area_bruta > 0 && p.area_vaos / p.area_bruta > 0.4) {
        alerts.push({
          type: 'warning',
          title: `Área de vãos elevada — ${p.referencia}`,
          message: `O pano ${p.referencia} tem ${((p.area_vaos / p.area_bruta) * 100).toFixed(0)}% de vãos. Valores acima de 40% podem comprometer a integridade estrutural.`,
        });
      }
    });
  }

  // Check config frozen but modified
  if (config?.status === 'congelado') {
    alerts.push({
      type: 'info',
      title: 'Configuração congelada',
      message: 'Esta configuração está congelada. Alterações nos panos, fundações e lajes não irão alterar os parâmetros base.',
    });
  }

  // Check foundations without tension
  if (fundacoes) {
    const noTensao = fundacoes.filter(f => !f.tensao_admissivel_terreno);
    if (noTensao.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Fundações sem tensão admissível',
        message: `${noTensao.length} fundação(ões) sem tensão admissível do terreno definida.`,
      });
    }
  }

  // Check kg/m² index
  if (resumo && resumo.indice_kg_m2 > 0) {
    if (resumo.indice_kg_m2 > 25) {
      alerts.push({
        type: 'warning',
        title: 'Índice kg/m² acima da referência',
        message: `O índice atual é ${resumo.indice_kg_m2.toFixed(2)} kg/m². Para ICF, valores típicos situam-se entre 15–25 kg/m².`,
      });
    } else if (resumo.indice_kg_m2 < 15) {
      alerts.push({
        type: 'info',
        title: 'Índice kg/m² abaixo da referência',
        message: `O índice atual é ${resumo.indice_kg_m2.toFixed(2)} kg/m². Pode indicar que faltam estimativas de aço nos elementos.`,
      });
    }
  }

  // Check slabs without weight
  if (lajes) {
    const noWeight = lajes.filter(l => !l.peso_proprio_kn_m2);
    if (noWeight.length > 0) {
      alerts.push({
        type: 'info',
        title: 'Lajes sem peso próprio',
        message: `${noWeight.length} laje(s) sem peso próprio definido. O valor padrão para vigotas in situ é 2,53 kN/m².`,
      });
    }
  }

  if (alerts.length === 0) return null;

  const icon = (type: string) => {
    if (type === 'error') return <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />;
    if (type === 'warning') return <AlertTriangle className="h-4 w-4 text-accent-foreground shrink-0" />;
    return <Info className="h-4 w-4 text-primary shrink-0" />;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Axia™ — Alertas Técnicos ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((a, i) => (
          <div key={i} className="flex gap-2 p-3 rounded-lg border text-sm">
            {icon(a.type)}
            <div>
              <p className="font-medium">{a.title}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{a.message}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
