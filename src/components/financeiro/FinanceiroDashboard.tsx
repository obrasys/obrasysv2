import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Package,
  MoreHorizontal,
} from 'lucide-react';

interface DashboardData {
  totalPagar: number;
  totalReceber: number;
  pagoPagar: number;
  pagoReceber: number;
  saldo: number;
  saldoRealizado: number;
  vencidas: number;
  valorVencido: number;
  aVencer7Dias: number;
  valorAVencer: number;
  contasPorOrigem: {
    mao_de_obra: number;
    material: number;
    outros: number;
  };
}

interface FinanceiroDashboardProps {
  data?: DashboardData;
  isLoading?: boolean;
}

export function FinanceiroDashboard({ data, isLoading }: FinanceiroDashboardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const percentPago = data.totalPagar > 0 ? (data.pagoPagar / data.totalPagar) * 100 : 0;
  const percentRecebido = data.totalReceber > 0 ? (data.pagoReceber / data.totalReceber) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(data.totalPagar)}</p>
            <p className="text-sm text-muted-foreground">Total a Pagar</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Pago</span>
                <span>{Math.round(percentPago)}%</span>
              </div>
              <Progress value={percentPago} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(data.pagoPagar)} pago
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data.totalReceber)}</p>
            <p className="text-sm text-muted-foreground">Total a Receber</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Recebido</span>
                <span>{Math.round(percentRecebido)}%</span>
              </div>
              <Progress value={percentRecebido} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(data.pagoReceber)} recebido
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className={`text-2xl font-bold ${data.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.saldo)}
            </p>
            <p className="text-sm text-muted-foreground">Saldo Previsto</p>
            <p className={`text-xs mt-2 ${data.saldoRealizado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.saldoRealizado)} realizado
            </p>
          </CardContent>
        </Card>

        <Card className={data.vencidas > 0 ? 'border-red-300 bg-red-50/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-xl ${data.vencidas > 0 ? 'bg-red-100' : 'bg-yellow-100'} flex items-center justify-center`}>
                {data.vencidas > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : (
                  <Clock className="w-5 h-5 text-yellow-600" />
                )}
              </div>
            </div>
            {data.vencidas > 0 ? (
              <>
                <p className="text-2xl font-bold text-red-600">{data.vencidas}</p>
                <p className="text-sm text-muted-foreground">Contas Vencidas</p>
                <p className="text-xs text-red-600 mt-2">
                  {formatCurrency(data.valorVencido)} em atraso
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-yellow-600">{data.aVencer7Dias}</p>
                <p className="text-sm text-muted-foreground">A Vencer (7 dias)</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatCurrency(data.valorAVencer)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Despesas por Origem */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Despesas por Origem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatCurrency(data.contasPorOrigem.mao_de_obra)}</p>
                <p className="text-xs text-muted-foreground">Mão de Obra</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatCurrency(data.contasPorOrigem.material)}</p>
                <p className="text-xs text-muted-foreground">Material</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <MoreHorizontal className="w-5 h-5 text-muted-foreground" />

              </div>
              <div>
                <p className="text-lg font-bold">{formatCurrency(data.contasPorOrigem.outros)}</p>
                <p className="text-xs text-muted-foreground">Outros</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
