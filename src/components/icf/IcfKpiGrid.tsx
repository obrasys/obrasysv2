import { Card, CardContent } from '@/components/ui/card';

interface Props {
  resumo: {
    volume_total_obra?: number;
    area_liquida_total?: number;
    indice_m3_m2?: number;
    indice_kg_m2?: number;
  };
}

const Kpi = ({ label, value }: { label: string; value: string }) => (
  <Card><CardContent className="pt-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
  </CardContent></Card>
);

export const IcfKpiGrid = ({ resumo }: Props) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <Kpi label="Volume Betão Total" value={`${resumo.volume_total_obra?.toFixed(2) ?? '0.00'} m³`} />
    <Kpi label="Área Líquida Paredes" value={`${resumo.area_liquida_total?.toFixed(2) ?? '0.00'} m²`} />
    <Kpi label="Índice m³/m²" value={resumo.indice_m3_m2?.toFixed(4) ?? '—'} />
    <Kpi label="Índice kg/m²" value={resumo.indice_kg_m2?.toFixed(2) ?? '—'} />
  </div>
);
