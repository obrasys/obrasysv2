import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, Package, Truck } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFornecedores } from '@/hooks/useFinanceiro';
import {
  useTenantPricebookItemsSearch,
  type PricebookItemRow,
} from '@/hooks/useTenantPricebookItemsSearch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  capituloId: string | null;
  orcamentoId?: string;
}

interface PickedItem {
  row: PricebookItemRow;
  quantidade: number;
}

export function AddFromPricebookDialog({ open, onOpenChange, capituloId, orcamentoId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { fornecedores } = useFornecedores();
  const [search, setSearch] = useState('');
  const [fornFilter, setFornFilter] = useState<string>('all');
  const [picked, setPicked] = useState<Record<string, PickedItem>>({});
  const [saving, setSaving] = useState(false);

  const { data: items, isLoading } = useTenantPricebookItemsSearch(
    search,
    fornFilter === 'all' ? undefined : fornFilter
  );

  const pickedList = useMemo(() => Object.values(picked), [picked]);

  const toggle = (row: PricebookItemRow) => {
    setPicked((prev) => {
      const next = { ...prev };
      if (next[row.id]) delete next[row.id];
      else next[row.id] = { row, quantidade: 1 };
      return next;
    });
  };

  const setQty = (id: string, q: number) => {
    setPicked((prev) =>
      prev[id] ? { ...prev, [id]: { ...prev[id], quantidade: q } } : prev
    );
  };

  const reset = () => {
    setSearch('');
    setFornFilter('all');
    setPicked({});
  };

  const close = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleInsert = async () => {
    if (!capituloId || pickedList.length === 0) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('artigos_orcamento')
        .select('ordem')
        .eq('capitulo_id', capituloId)
        .order('ordem', { ascending: false })
        .limit(1);
      let nextOrdem = existing && existing.length > 0 ? existing[0].ordem + 1 : 1;

      const rows = pickedList.map(({ row, quantidade }) => ({
        capitulo_id: capituloId,
        codigo: row.codigo_artigo || null,
        descricao: row.descricao,
        unidade: row.unidade || 'un',
        quantidade,
        preco_unitario: row.preco_unitario,
        custo_mat: row.preco_unitario,
        ordem: nextOrdem++,
        source: 'supplier_pricebook',
        supplier_pricebook_item_id: row.id,
        supplier_pricebook_id: row.pricebook_id,
        supplier_fornecedor_id: row.fornecedor_id,
        supplier_pricebook_origin_price: row.preco_unitario,
      }));

      const { error } = await supabase.from('artigos_orcamento').insert(rows);
      if (error) throw error;

      toast({
        title: `${rows.length} artigo${rows.length === 1 ? '' : 's'} adicionado${rows.length === 1 ? '' : 's'}`,
        description: 'Origem: tabela de fornecedor',
      });
      if (orcamentoId) qc.invalidateQueries({ queryKey: ['orcamento', orcamentoId] });
      close(false);
    } catch (e: any) {
      toast({
        title: 'Erro ao adicionar artigos',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" /> Adicionar de tabela de fornecedor
          </DialogTitle>
          <DialogDescription>
            Pesquise nas tabelas de preços importadas dos seus fornecedores e adicione ao capítulo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por descrição, código ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={fornFilter} onValueChange={setFornFilter}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Todos os fornecedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os fornecedores</SelectItem>
              {fornecedores?.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[140px]">Fornecedor</TableHead>
                <TableHead className="w-[80px]">Unid.</TableHead>
                <TableHead className="w-[110px] text-right">Preço (€)</TableHead>
                <TableHead className="w-[110px]">Quantidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (!items || items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {search
                      ? 'Nenhum item encontrado'
                      : 'Importe primeiro uma tabela de preços num fornecedor'}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                items?.map((row) => {
                  const isPicked = !!picked[row.id];
                  return (
                    <TableRow
                      key={row.id}
                      className={isPicked ? 'bg-primary/5' : ''}
                    >
                      <TableCell>
                        <Checkbox checked={isPicked} onCheckedChange={() => toggle(row)} />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.descricao}</div>
                        <div className="text-xs text-muted-foreground flex gap-2 flex-wrap mt-0.5">
                          {row.codigo_artigo && <span>#{row.codigo_artigo}</span>}
                          {row.categoria && <Badge variant="outline" className="text-[10px] py-0">{row.categoria}</Badge>}
                          {row.pricebook_name && <span className="truncate max-w-[200px]">{row.pricebook_name}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{row.fornecedor_nome || '—'}</TableCell>
                      <TableCell>{row.unidade || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.preco_unitario.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {isPicked ? (
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={picked[row.id].quantidade}
                            onChange={(e) =>
                              setQty(row.id, parseFloat(e.target.value) || 0)
                            }
                            className="h-8"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter className="gap-2 items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {pickedList.length} selecionado{pickedList.length === 1 ? '' : 's'}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => close(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInsert} disabled={pickedList.length === 0 || saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> A adicionar...
                </>
              ) : (
                <>Adicionar ao capítulo</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
