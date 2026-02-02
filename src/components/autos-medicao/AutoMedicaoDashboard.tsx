import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFormatting } from '@/hooks/useFormatting';
import { FileText, TrendingUp, AlertTriangle, CheckCircle, Clock, Euro } from 'lucide-react';
import type { AutoMedicao } from '@/types/autos-medicao';

interface AutoMedicaoDashboardProps {
  autos: AutoMedicao[];
}

export function AutoMedicaoDashboard({ autos }: AutoMedicaoDashboardProps) {
  const { formatCurrency } = useFormatting();

  const stats = {
    total: autos.length,
    rascunho: autos.filter(a => a.estado === 'rascunho').length,
    submetido: autos.filter(a => a.estado === 'submetido').length,
    aprovado: autos.filter(a => a.estado === 'aprovado').length,
    valorTotal: autos.reduce((acc, a) => acc + (a.valor_medido_atual || 0), 0),
    valorTotalComIva: autos.reduce((acc, a) => acc + (a.valor_total_com_iva || 0), 0),
    progressoMedio: autos.length > 0 
      ? autos.reduce((acc, a) => acc + (a.percentagem_global || 0), 0) / autos.length 
      : 0,
    comDesvio: autos.filter(a => 
      (a.itens || []).some(item => !item.dentro_tolerancia)
    ).length,
  };

  const cards = [
    {
      title: 'Total de Autos',
      value: stats.total,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Valor Total Medido',
      value: formatCurrency(stats.valorTotal),
      icon: Euro,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Progresso Médio',
      value: `${stats.progressoMedio.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Com Desvios',
      value: stats.comDesvio,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Rascunhos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.rascunho}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Submetidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.submetido}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Aprovados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.aprovado}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity or alerts could go here */}
      {stats.comDesvio > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Atenção: Desvios Detetados</p>
                <p className="text-sm text-amber-700 mt-1">
                  Existem {stats.comDesvio} auto(s) de medição com itens fora da tolerância definida.
                  Reveja as justificações antes de submeter.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
