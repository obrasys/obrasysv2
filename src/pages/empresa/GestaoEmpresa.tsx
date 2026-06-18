import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Wallet, Building2, ExternalLink } from 'lucide-react';
import { useGestaoEmpresa } from '@/hooks/useGestaoEmpresa';
import { fmtEUR } from '@/lib/finance';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function GestaoEmpresa() {
  const [year, setYear] = useState(currentYear);
  const { data, isLoading } = useGestaoEmpresa(year);

  return (
    <AppLayout
      title="Gestão da Empresa"
      actions={
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {isLoading || !data ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPIs principais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Receitas (Obras)"
                value={data.totalReceitas}
                hint={`${fmtEUR(0)} previsto vs realizado`}
                icon={<TrendingUp className="w-5 h-5 text-green-600" />}
                tint="bg-green-100"
              />
              <KpiCard
                label="Custos de Obra"
                value={data.totalCustosObra}
                icon={<TrendingDown className="w-5 h-5 text-red-600" />}
                tint="bg-red-100"
                valueClass="text-red-600"
              />
              <KpiCard
                label="Σ Margem Bruta"
                value={data.somaMB}
                hint={`Realizada: ${fmtEUR(data.somaMBRealizada)}`}
                icon={<Wallet className="w-5 h-5 text-blue-600" />}
                tint="bg-blue-100"
                valueClass={data.somaMB >= 0 ? 'text-green-600' : 'text-red-600'}
              />
              <KpiCard
                label="RAI da Empresa"
                value={data.rai}
                hint={`Realizado: ${fmtEUR(data.raiRealizado)} · CE: ${fmtEUR(data.custosEstrutura)}`}
                icon={<Building2 className="w-5 h-5 text-primary" />}
                tint="bg-primary/10"
                valueClass={data.rai >= 0 ? 'text-green-600' : 'text-red-600'}
              />
            </div>

            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                <strong className="text-foreground">Fórmulas:</strong> MB da obra = Receitas −
                Custos · RAI da empresa = Σ(MB de obras) − Custos de Estrutura (CE). Valores filtrados
                por ano de vencimento. "Realizado" considera apenas linhas pagas.
              </CardContent>
            </Card>

            <Tabs defaultValue="obras" className="w-full">
              <TabsList>
                <TabsTrigger value="obras">Resultado por Obra ({data.obras.length})</TabsTrigger>
                <TabsTrigger value="estrutura">
                  Custos de Estrutura ({data.ceBreakdown.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="obras" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Margem Bruta por Obra · {year}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="text-left px-4 py-3">Obra</th>
                            <th className="text-right px-4 py-3">Receitas</th>
                            <th className="text-right px-4 py-3">Custos</th>
                            <th className="text-right px-4 py-3">MB</th>
                            <th className="text-right px-4 py-3">MB %</th>
                            <th className="text-right px-4 py-3">MB Realizada</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.obras.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                Sem obras com movimento financeiro em {year}.
                              </td>
                            </tr>
                          ) : (
                            data.obras.map((o) => (
                              <tr key={o.obra_id} className="border-t hover:bg-muted/30">
                                <td className="px-4 py-3">
                                  <div className="font-medium">{o.nome}</div>
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    {o.status}
                                  </Badge>
                                </td>
                                <td className="text-right px-4 py-3 text-green-700">
                                  {fmtEUR(o.receitas)}
                                </td>
                                <td className="text-right px-4 py-3 text-red-700">
                                  {fmtEUR(o.custos)}
                                </td>
                                <td
                                  className={`text-right px-4 py-3 font-semibold ${
                                    o.mb >= 0 ? 'text-green-700' : 'text-red-700'
                                  }`}
                                >
                                  {fmtEUR(o.mb)}
                                </td>
                                <td className="text-right px-4 py-3">{o.mbPct.toFixed(1)}%</td>
                                <td className="text-right px-4 py-3 text-muted-foreground">
                                  {fmtEUR(o.mb_realizada)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button asChild variant="ghost" size="sm">
                                    <Link to={`/obras/${o.obra_id}`}>
                                      <ExternalLink className="w-4 h-4" />
                                    </Link>
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {data.obras.length > 0 && (
                          <tfoot className="bg-muted/40 font-semibold">
                            <tr className="border-t-2">
                              <td className="px-4 py-3">Total</td>
                              <td className="text-right px-4 py-3 text-green-700">
                                {fmtEUR(data.totalReceitas)}
                              </td>
                              <td className="text-right px-4 py-3 text-red-700">
                                {fmtEUR(data.totalCustosObra)}
                              </td>
                              <td
                                className={`text-right px-4 py-3 ${
                                  data.somaMB >= 0 ? 'text-green-700' : 'text-red-700'
                                }`}
                              >
                                {fmtEUR(data.somaMB)}
                              </td>
                              <td className="text-right px-4 py-3">
                                {data.totalReceitas > 0
                                  ? ((data.somaMB / data.totalReceitas) * 100).toFixed(1)
                                  : '0.0'}
                                %
                              </td>
                              <td className="text-right px-4 py-3">
                                {fmtEUR(data.somaMBRealizada)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="estrutura" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Custos de Estrutura (CE) · {year} ·{' '}
                      <span className="text-red-700">{fmtEUR(data.custosEstrutura)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="text-left px-4 py-3">Código</th>
                            <th className="text-left px-4 py-3">Centro de Custo</th>
                            <th className="text-right px-4 py-3">Previsto</th>
                            <th className="text-right px-4 py-3">Pago</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.ceBreakdown.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center py-12 text-muted-foreground">
                                Sem custos imputados a centros de estrutura. Classifique contas em{' '}
                                <Link to="/financeiro" className="underline">
                                  Financeiro
                                </Link>{' '}
                                usando o seletor de Centro de Custo.
                              </td>
                            </tr>
                          ) : (
                            data.ceBreakdown.map((c) => (
                              <tr key={c.cost_center_id} className="border-t hover:bg-muted/30">
                                <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                                <td className="px-4 py-3">{c.name}</td>
                                <td className="text-right px-4 py-3 text-red-700">
                                  {fmtEUR(c.total)}
                                </td>
                                <td className="text-right px-4 py-3 text-muted-foreground">
                                  {fmtEUR(c.pago)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tint,
  valueClass,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: React.ReactNode;
  tint: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className={`w-10 h-10 rounded-xl ${tint} flex items-center justify-center mb-2`}>
          {icon}
        </div>
        <p className={`text-2xl font-bold ${valueClass ?? ''}`}>{fmtEUR(value)}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-2">{hint}</p>}
      </CardContent>
    </Card>
  );
}
