import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Loader2 } from 'lucide-react';
import { useInstalacoes } from '@/hooks/useInstalacoes';
import { useFormatting } from '@/hooks/useFormatting';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  packageId: string;
  obraId: string;
}

export function PreviaOrcamentoCard({ packageId, obraId }: Props) {
  const { usePackageItems } = useInstalacoes();
  const { data: items = [], isLoading } = usePackageItems(packageId);
  const { formatCurrency } = useFormatting();
  const { orcamentos } = useOrcamentos();
  const [selectedOrcamento, setSelectedOrcamento] = useState<string>('');
  const [inserting, setInserting] = useState(false);

  const total = items.reduce((s, i) => s + Number(i.total_cost), 0);

  // Filter orçamentos by obra
  const obraOrcamentos = (orcamentos ?? []).filter(o => o.obra_id === obraId);

  const handleInsertIntoOrcamento = async () => {
    if (!selectedOrcamento || items.length === 0) return;
    setInserting(true);

    try {
      // Get the next chapter number
      const { data: chapters } = await supabase
        .from('capitulos_orcamento')
        .select('numero')
        .eq('orcamento_id', selectedOrcamento)
        .order('numero', { ascending: false })
        .limit(1);

      const nextNum = (chapters && chapters.length > 0 ? chapters[0].numero : 0) + 1;

      // Create the chapter
      const { data: chapter, error: chError } = await supabase
        .from('capitulos_orcamento')
        .insert({
          orcamento_id: selectedOrcamento,
          numero: nextNum,
          titulo: 'Instalações',
          ordem: nextNum,
        })
        .select()
        .single();

      if (chError) throw chError;

      // Insert articles from package items
      const articles = items.map((item, idx) => ({
        capitulo_id: chapter.id,
        descricao: item.name,
        unidade: item.unit,
        quantidade: Number(item.qty),
        preco_unitario: Number(item.unit_cost_material) + Number(item.unit_cost_labor),
        ordem: idx + 1,
      }));

      const { error: artError } = await supabase
        .from('artigos_orcamento')
        .insert(articles);

      if (artError) throw artError;

      toast.success(`${items.length} itens inseridos no orçamento`);
      setSelectedOrcamento('');
    } catch (e: any) {
      toast.error('Erro ao inserir no orçamento: ' + e.message);
    } finally {
      setInserting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Prévia do Orçamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">Sem itens</p>
        ) : (
          <>
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

            {/* Insert into Orçamento */}
            <div className="flex items-center gap-3 pt-2 border-t">
              <Select value={selectedOrcamento} onValueChange={setSelectedOrcamento}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecionar orçamento..." />
                </SelectTrigger>
                <SelectContent>
                  {obraOrcamentos.length === 0 ? (
                    <SelectItem value="__none" disabled>Nenhum orçamento nesta obra</SelectItem>
                  ) : (
                    obraOrcamentos.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.titulo}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={handleInsertIntoOrcamento}
                disabled={!selectedOrcamento || inserting}
                size="sm"
              >
                {inserting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
                Inserir no Orçamento
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
