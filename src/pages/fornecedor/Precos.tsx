import { useState } from 'react';
import { SupplierLayout } from '@/components/fornecedor/SupplierLayout';
import {
  useSupplierPricebooks,
  usePricebookItems,
  useCreatePricebook,
  useUpdatePricebook,
  useUpsertPricebookItem,
  useDeletePricebookItem,
} from '@/hooks/useSuppliers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Package, Edit2, Trash2, BookOpen, CheckCircle2, FileText, Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupplierCategories } from '@/hooks/useSuppliers';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  published: 'bg-primary/10 text-primary',
  archived: 'bg-muted text-muted-foreground line-through',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  archived: 'Arquivado',
};

export default function FornecedorPrecos() {
  const { data: pricebooks = [], isLoading } = useSupplierPricebooks();
  const { data: categories = [] } = useSupplierCategories();
  const createPricebook = useCreatePricebook();
  const updatePricebook = useUpdatePricebook();
  const upsertItem = useUpsertPricebookItem();
  const deleteItem = useDeletePricebookItem();

  const [selectedPb, setSelectedPb] = useState<string>('');
  const { data: items = [] } = usePricebookItems(selectedPb || undefined);

  const [newPbName, setNewPbName] = useState('');
  const [showNewPb, setShowNewPb] = useState(false);

  const [editItem, setEditItem] = useState<any>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({
    item_name: '', item_code: '', unit: 'un', base_price: 0,
    vat_rate: 23, lead_time_days: 1, notes: '', category_id: '',
  });

  const handleCreatePb = () => {
    if (!newPbName.trim()) return;
    createPricebook.mutate({ name: newPbName }, {
      onSuccess: () => { setNewPbName(''); setShowNewPb(false); }
    });
  };

  const openItemForm = (item?: any) => {
    setEditItem(item || null);
    setItemForm(item ? {
      item_name: item.item_name,
      item_code: item.item_code || '',
      unit: item.unit,
      base_price: item.base_price,
      vat_rate: item.vat_rate,
      lead_time_days: item.lead_time_days,
      notes: item.notes || '',
      category_id: item.category_id || '',
    } : {
      item_name: '', item_code: '', unit: 'un', base_price: 0,
      vat_rate: 23, lead_time_days: 1, notes: '', category_id: '',
    });
    setShowItemForm(true);
  };

  const handleSaveItem = () => {
    if (!selectedPb || !itemForm.item_name.trim()) return;
    upsertItem.mutate({
      ...(editItem ? { id: editItem.id } : {}),
      pricebook_id: selectedPb,
      item_name: itemForm.item_name,
      item_code: itemForm.item_code || null,
      unit: itemForm.unit,
      base_price: itemForm.base_price,
      vat_rate: itemForm.vat_rate,
      lead_time_days: itemForm.lead_time_days,
      notes: itemForm.notes || null,
      category_id: itemForm.category_id || null,
    }, { onSuccess: () => setShowItemForm(false) });
  };

  const currentPb: any = pricebooks.find((pb: any) => pb.id === selectedPb);

  return (
    <SupplierLayout title="Base de Preços" subtitle="Gerencie as suas tabelas de preços">
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Pricebook list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Tabelas</p>
            <Button size="sm" variant="outline" onClick={() => setShowNewPb(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {showNewPb && (
            <div className="p-3 border rounded-lg space-y-2">
              <Input
                placeholder="Nome da tabela..."
                value={newPbName}
                onChange={(e) => setNewPbName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePb()}
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleCreatePb} disabled={createPricebook.isPending}>
                  Criar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewPb(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar...</p>
          ) : pricebooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Sem tabelas</p>
            </div>
          ) : (
            pricebooks.map((pb: any) => (
              <button
                key={pb.id}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedPb === pb.id ? 'bg-accent/10 border-accent' : 'hover:bg-muted/50'}`}
                onClick={() => setSelectedPb(pb.id)}
              >
                <p className="text-sm font-medium truncate">{pb.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <Badge className={`text-xs ${STATUS_COLORS[pb.status]}`}>
                    {STATUS_LABELS[pb.status]}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Items */}
        <div className="lg:col-span-3">
          {!selectedPb ? (
            <div className="text-center py-20 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Selecione uma tabela de preços</p>
            </div>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{currentPb?.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{items.length} artigos</p>
                </div>
                <div className="flex gap-2">
                  {currentPb?.status === 'draft' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updatePricebook.mutate({ id: selectedPb, status: 'published' })}
                    >
                      <Globe className="h-4 w-4 mr-1" />
                      Publicar
                    </Button>
                  )}
                  {currentPb?.status === 'published' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updatePricebook.mutate({ id: selectedPb, status: 'draft' })}
                    >
                      Despublicar
                    </Button>
                  )}
                  <Button size="sm" onClick={() => openItemForm()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Sem artigos nesta tabela</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => openItemForm()}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar artigo
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Artigo</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Un.</TableHead>
                          <TableHead className="text-right">Preço (€)</TableHead>
                          <TableHead className="text-right">IVA%</TableHead>
                          <TableHead className="text-right">Prazo (d)</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.item_code || '—'}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell className="text-right">{Number(item.base_price).toFixed(2)}</TableCell>
                            <TableCell className="text-right">{item.vat_rate}%</TableCell>
                            <TableCell className="text-right">{item.lead_time_days}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                <Button size="icon" variant="ghost" onClick={() => openItemForm(item)}>
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => deleteItem.mutate({ id: item.id, pricebookId: selectedPb })}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Item form dialog */}
      <Dialog open={showItemForm} onOpenChange={setShowItemForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Editar Artigo' : 'Novo Artigo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome do artigo *</Label>
              <Input value={itemForm.item_name} onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })} placeholder="ex: Azulejo 20x20cm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Código</Label>
                <Input value={itemForm.item_code} onChange={(e) => setItemForm({ ...itemForm, item_code: e.target.value })} placeholder="AZ-001" />
              </div>
              <div className="space-y-1">
                <Label>Unidade *</Label>
                <Input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="un, m2, kg..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Preço base (€) *</Label>
                <Input type="number" step="0.01" value={itemForm.base_price} onChange={(e) => setItemForm({ ...itemForm, base_price: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label>IVA (%)</Label>
                <Input type="number" value={itemForm.vat_rate} onChange={(e) => setItemForm({ ...itemForm, vat_rate: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Prazo de entrega (dias)</Label>
              <Input type="number" value={itemForm.lead_time_days} onChange={(e) => setItemForm({ ...itemForm, lead_time_days: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={itemForm.category_id} onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemForm(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem} disabled={upsertItem.isPending}>
              {upsertItem.isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SupplierLayout>
  );
}
