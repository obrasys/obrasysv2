import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFormatting } from '@/hooks/useFormatting';
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { AutoMedicaoItemForm } from './AutoMedicaoItemForm';
import type { AutoMedicaoItem, AutoMedicaoItemFormData } from '@/types/autos-medicao';

interface AutoMedicaoItemsTableProps {
  items: AutoMedicaoItem[];
  autoId: string;
  readOnly?: boolean;
  onAddItem?: (item: AutoMedicaoItemFormData) => void;
  onUpdateItem?: (id: string, data: Partial<AutoMedicaoItemFormData>) => void;
  onDeleteItem?: (id: string) => void;
}

export function AutoMedicaoItemsTable({ 
  items, 
  autoId, 
  readOnly = false,
  onAddItem,
  onUpdateItem,
  onDeleteItem 
}: AutoMedicaoItemsTableProps) {
  const { formatCurrency, formatNumber } = useFormatting();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AutoMedicaoItem | null>(null);

  const handleAddItem = (data: AutoMedicaoItemFormData) => {
    onAddItem?.(data);
    setIsAddOpen(false);
  };

  const handleUpdateItem = (data: AutoMedicaoItemFormData) => {
    if (editingItem) {
      onUpdateItem?.(editingItem.id, data);
      setEditingItem(null);
    }
  };

  const totals = items.reduce((acc, item) => ({
    valorPrevisto: acc.valorPrevisto + (item.valor_previsto || 0),
    valorAtual: acc.valorAtual + (item.valor_atual || 0),
    valorAcumulado: acc.valorAcumulado + (item.valor_acumulado || 0),
  }), { valorPrevisto: 0, valorAtual: 0, valorAcumulado: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Itens Medidos</h3>
        {!readOnly && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Item de Medição</DialogTitle>
              </DialogHeader>
              <AutoMedicaoItemForm onSubmit={handleAddItem} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center w-[60px]">Un.</TableHead>
              <TableHead className="text-right w-[100px]">Previsto</TableHead>
              <TableHead className="text-right w-[100px]">Anterior</TableHead>
              <TableHead className="text-right w-[100px]">Atual</TableHead>
              <TableHead className="text-right w-[100px]">Acumulado</TableHead>
              <TableHead className="text-right w-[100px]">Preço Un.</TableHead>
              <TableHead className="text-right w-[120px]">Valor Atual</TableHead>
              <TableHead className="text-center w-[60px]">Desvio</TableHead>
              {!readOnly && <TableHead className="w-[80px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 10 : 11} className="text-center py-8 text-muted-foreground">
                  Nenhum item adicionado
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium line-clamp-2">{item.descricao}</p>
                      {item.capitulo && (
                        <p className="text-xs text-muted-foreground">Cap: {item.capitulo}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{item.unidade}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.quantidade_prevista || 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.quantidade_anterior || 0)}</TableCell>
                  <TableCell className="text-right font-medium">{formatNumber(item.quantidade_atual || 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.quantidade_acumulada || 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.preco_unitario || 0)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.valor_atual || 0)}</TableCell>
                  <TableCell className="text-center">
                    {item.dentro_tolerancia ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-xs text-amber-600">
                          {(item.desvio_percentual || 0).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Dialog open={editingItem?.id === item.id} onOpenChange={(open) => !open && setEditingItem(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Editar Item</DialogTitle>
                            </DialogHeader>
                            <AutoMedicaoItemForm item={item} onSubmit={handleUpdateItem} />
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => onDeleteItem?.(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Totais */}
      {items.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Valor Previsto</p>
              <p className="text-lg font-semibold">{formatCurrency(totals.valorPrevisto)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Atual</p>
              <p className="text-lg font-semibold text-primary">{formatCurrency(totals.valorAtual)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Acumulado</p>
              <p className="text-lg font-semibold">{formatCurrency(totals.valorAcumulado)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
