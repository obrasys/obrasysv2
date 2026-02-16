import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInstalacoes } from '@/hooks/useInstalacoes';
import { useFormatting } from '@/hooks/useFormatting';

interface Props {
  packageId: string;
}

export function PreviaOrcamentoCard({ packageId }: Props) {
  const { usePackageItems } = useInstalacoes();
  const { data: items = [], isLoading } = usePackageItems(packageId);
  const { formatCurrency } = useFormatting();

  const total = items.reduce((s, i) => s + Number(i.total_cost), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Prévia do Orçamento</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">Sem itens</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Item</th>
                  <th className="text-right py-2">Qtd</th>
                  <th className="text-left py-2">Un</th>
                  <th className="text-right py-2">Material</th>
                  <th className="text-right py-2">M.O.</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-right">{Number(item.qty)}</td>
                    <td className="py-2">{item.unit}</td>
                    <td className="py-2 text-right">{formatCurrency(Number(item.unit_cost_material))}</td>
                    <td className="py-2 text-right">{formatCurrency(Number(item.unit_cost_labor))}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(Number(item.total_cost))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={5} className="py-2 text-right">Total</td>
                  <td className="py-2 text-right">{formatCurrency(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
