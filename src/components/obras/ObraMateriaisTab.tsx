import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Package, Wrench, Plus, Filter, Loader2, ArrowRightLeft,
  CheckCircle, XCircle, Eye, ExternalLink, Boxes,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  useProjectAllocations, useProjectMaterialRequests,
  useCatalogItems, useCatalogItemsMutation,
} from '@/hooks/useProjectResources';
import {
  ITEM_TYPE_CONFIG, ALLOCATION_STATUS_CONFIG,
  REQUEST_PRIORITY_CONFIG, REQUEST_STATUS_CONFIG,
  UNIT_OPTIONS,
  type ItemType, type AllocationStatus, type RequestPriority,
  type RdoMaterialRequest,
} from '@/types/project-resources';

interface ObraMateriaisTabProps {
  obraId: string;
}

export function ObraMateriaisTab({ obraId }: ObraMateriaisTabProps) {
  const [showAllocationForm, setShowAllocationForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { allocations, isLoading: loadingAllocs, createAllocation, updateAllocationStatus, deleteAllocation } = useProjectAllocations(obraId);
  const { requests, isLoading: loadingReqs, updateRequestStatus, convertToAllocation } = useProjectMaterialRequests(obraId);
  const { items: catalogItems } = useCatalogItems();

  const filteredAllocations = typeFilter === 'all'
    ? allocations
    : allocations.filter(a => a.item_type === typeFilter);

  const pendingRequests = requests.filter(r => r.status === 'requested' || r.status === 'reviewed');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Materiais e Recursos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="allocations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="allocations">
              Destinações
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-1.5">
              Necessidades Pendentes
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5 ml-1">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Destinações Tab */}
          <TabsContent value="allocations" className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="w-3.5 h-3.5 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="material">🧱 Material</SelectItem>
                    <SelectItem value="insumo">🪣 Insumo</SelectItem>
                    <SelectItem value="tool">🔧 Ferramenta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={() => setShowAllocationForm(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Destinar Item
              </Button>
            </div>

            {loadingAllocs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAllocations.length > 0 ? (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllocations.map((alloc) => (
                      <TableRow key={alloc.id}>
                        <TableCell className="font-medium">{alloc.item_name}</TableCell>
                        <TableCell>
                          <span className="text-xs">
                            {ITEM_TYPE_CONFIG[alloc.item_type as ItemType]?.emoji}{' '}
                            {ITEM_TYPE_CONFIG[alloc.item_type as ItemType]?.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{alloc.quantity} {alloc.unit}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(alloc.allocation_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ALLOCATION_STATUS_CONFIG[alloc.status as AllocationStatus]?.color}>
                            {ALLOCATION_STATUS_CONFIG[alloc.status as AllocationStatus]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {alloc.status === 'planned' && (
                              <Button size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => updateAllocationStatus.mutate({ id: alloc.id, status: 'allocated' })}>
                                <CheckCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {alloc.status === 'allocated' && (
                              <Button size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => updateAllocationStatus.mutate({ id: alloc.id, status: 'delivered' })}>
                                <CheckCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {(alloc.status === 'planned' || alloc.status === 'allocated') && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                                onClick={() => updateAllocationStatus.mutate({ id: alloc.id, status: 'cancelled' })}>
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Boxes className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum item destinado a esta obra.</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowAllocationForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Destinar Primeiro Item
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Necessidades Pendentes Tab */}
          <TabsContent value="requests" className="space-y-4">
            {loadingReqs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length > 0 ? (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead>Necessário para</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {req.free_text_item_name || 'Item do catálogo'}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs">
                            {ITEM_TYPE_CONFIG[req.item_type as ItemType]?.emoji}{' '}
                            {ITEM_TYPE_CONFIG[req.item_type as ItemType]?.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{req.quantity} {req.unit}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(req.needed_for_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={REQUEST_PRIORITY_CONFIG[req.priority as RequestPriority]?.color}>
                            {REQUEST_PRIORITY_CONFIG[req.priority as RequestPriority]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={REQUEST_STATUS_CONFIG[req.status as keyof typeof REQUEST_STATUS_CONFIG]?.color}>
                            {REQUEST_STATUS_CONFIG[req.status as keyof typeof REQUEST_STATUS_CONFIG]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {req.status === 'requested' && (
                              <Button size="icon" variant="ghost" className="h-7 w-7"
                                title="Marcar como revisto"
                                onClick={() => updateRequestStatus.mutate({ id: req.id, status: 'reviewed' })}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {(req.status === 'requested' || req.status === 'reviewed') && (
                              <>
                                <Button size="icon" variant="ghost" className="h-7 w-7"
                                  title="Converter em destinação"
                                  onClick={() => convertToAllocation.mutate(req)}>
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                                  title="Cancelar"
                                  onClick={() => updateRequestStatus.mutate({ id: req.id, status: 'cancelled' })}>
                                  <XCircle className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma necessidade registada.</p>
                <p className="text-sm mt-1">As necessidades lançadas nos RDOs aparecem aqui.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Allocation Form Dialog */}
      <AllocationFormDialog
        open={showAllocationForm}
        onOpenChange={setShowAllocationForm}
        obraId={obraId}
        catalogItems={catalogItems}
        onSubmit={(data) => {
          createAllocation.mutate(data);
          setShowAllocationForm(false);
        }}
        isLoading={createAllocation.isPending}
      />
    </Card>
  );
}

// ---- Allocation Form Dialog ----

function AllocationFormDialog({
  open, onOpenChange, obraId, catalogItems, onSubmit, isLoading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  obraId: string;
  catalogItems: any[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState<ItemType>('material');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('un');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState('');

  const handleCatalogSelect = (id: string) => {
    setSelectedCatalogId(id);
    const item = catalogItems.find(i => i.id === id);
    if (item) {
      setItemName(item.name);
      setItemType(item.item_type);
      setUnit(item.unit);
    }
  };

  const handleSubmit = () => {
    if (!itemName.trim() || !quantity) return;
    onSubmit({
      project_id: obraId,
      item_id: selectedCatalogId || undefined,
      item_name: itemName,
      item_type: itemType,
      quantity: parseFloat(quantity),
      unit,
      allocation_date: date,
      notes: notes || undefined,
    });
    // Reset
    setItemName('');
    setQuantity('');
    setNotes('');
    setSelectedCatalogId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Destinar Item à Obra</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {catalogItems.length > 0 && (
            <div>
              <label className="text-sm font-medium">Item do catálogo (opcional)</label>
              <Select value={selectedCatalogId} onValueChange={handleCatalogSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar do catálogo..." />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {catalogItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {ITEM_TYPE_CONFIG[item.item_type as ItemType]?.emoji} {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Nome do item *</label>
            <Input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Ex: Cimento Portland" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select value={itemType} onValueChange={(v) => setItemType(v as ItemType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="material">🧱 Material</SelectItem>
                  <SelectItem value="insumo">🪣 Insumo</SelectItem>
                  <SelectItem value="tool">🔧 Ferramenta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Data</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Quantidade *</label>
              <Input type="number" min={0} step={0.01} value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium">Unidade</label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {UNIT_OPTIONS.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Observações</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas..." className="resize-none min-h-[60px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !itemName.trim() || !quantity}>
            {isLoading ? 'A guardar...' : 'Destinar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
