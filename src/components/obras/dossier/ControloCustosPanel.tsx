import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Loader2 } from 'lucide-react';
import { useDossierObra } from '@/hooks/useDossierObra';

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n || 0);

interface Props {
  obraId: string;
}

export function ControloCustosPanel({ obraId }: Props) {
  const { data, isLoading } = useDossierObra(obraId);

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Controlo de Custos por Capítulo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> A carregar dados financeiros…
          </div>
        ) : !data || data.capitulos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Sem orçamento com capítulos para esta obra.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Capítulo</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Adjudicado</TableHead>
                  <TableHead className="text-right">Faturado</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="w-32">% Executada</TableHead>
                  <TableHead className="text-right">Desvio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.capitulos.map((c) => (
                  <TableRow key={c.key + c.numero}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.numero ?? '-'}</TableCell>
                    <TableCell className="font-medium">{c.titulo}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(c.base)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(c.adjudicado)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(c.faturado)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(c.pago)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(c.saldo)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(100, Math.max(0, c.pctExecutada))} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground tabular-nums w-9 text-right">
                          {c.pctExecutada.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          c.desvioPct > 5
                            ? 'border-destructive/40 text-destructive'
                            : c.desvioPct < -5
                              ? 'border-emerald-500/40 text-emerald-600'
                              : ''
                        }
                      >
                        {c.desvioPct > 0 ? '+' : ''}
                        {c.desvioPct.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell />
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{fmt(data.totals.base)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{fmt(data.totals.adjudicado)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{fmt(data.totals.faturado)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{fmt(data.totals.pago)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{fmt(data.totals.saldo)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
