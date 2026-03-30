import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Loader2, Package } from 'lucide-react';
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

  const totalMaterial = items.reduce((s, i) => s + Number(i.unit_cost_material) * Number(i.qty), 0);
  const totalLabor = items.reduce((s, i) => s + Number(i.unit_cost_labor) * Number(i.qty), 0);
  const total = items.reduce((s, i) => s + Number(i.total_cost), 0);
  const obraOrcamentos = (orcamentos ?? []).filter(o => o.obra_id === obraId);

  const handleInsertIntoOrcamento = async () => {
    if (!selectedOrcamento || items.length === 0) return;
    setInserting(true);

    try {
      const { data: chapters } = await supabase
        .from('capitulos_orcamento')
        .select('numero')
        .eq('orcamento_id', selectedOrcamento)
        .order('numero', { ascending: false })
        .limit(1);

      const nextNum = (chapters && chapters.length > 0 ? chapters[0].numero : 0) + 1;

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <Package className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Sem itens de orçamento</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1">Material: {formatCurrency(totalMaterial)}</Badge>
        <Badge variant="outline" className="gap-1">M.O.: {formatCurrency(totalLabor)}</Badge>
        <Badge className="gap-1">Total: {formatCurrency(total)}</Badge>
      </div>

      {/* Items table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs">Item</th>
              <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs">Qtd</th>
              <th className="text-center py-2.5 px-3 font-medium text-muted-foreground text-xs">Un</th>
              <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Material</th>
              <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">M.O.</th>
              <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                <td className="py-2 px-3">{item.name}</td>
                <td className="py-2 px-3 text-right tabular-nums">{Number(item.qty)}</td>
                <td className="py-2 px-3 text-center text-muted-foreground">{item.unit}</td>
                <td className="py-2 px-3 text-right tabular-nums hidden md:table-cell">{formatCurrency(Number(item.unit_cost_material))}</td>
                <td className="py-2 px-3 text-right tabular-nums hidden md:table-cell">{formatCurrency(Number(item.unit_cost_labor))}</td>
                <td className="py-2 px-3 text-right font-medium tabular-nums">{formatCurrency(Number(item.total_cost))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-semibold bg-muted/30">
              <td colSpan={5} className="py-2.5 px-3 text-right hidden md:table-cell">Total</td>
              <td colSpan={3} className="py-2.5 px-3 text-right md:hidden">Total</td>
              <td className="py-2.5 px-3 text-right text-primary tabular-nums">{formatCurrency(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Insert into Orçamento */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t">
        <Select value={selectedOrcamento} onValueChange={setSelectedOrcamento}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Inserir num orçamento..." />
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
          className="gap-1.5 shrink-0"
        >
          {inserting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Inserir
        </Button>
      </div>
    </div>
  );
}
