import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SupplierLayout } from '@/components/fornecedor/SupplierLayout';
import {
  useSupplierQuoteRequests,
  useMarkQuoteViewed,
  useDeclineQuote,
  useCreateQuoteResponse,
  usePricebookItems,
  useSupplierPricebooks,
  useSupplierItemsByCategories,
  useSupplierProfile,
} from '@/hooks/useSuppliers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, MapPin, Calendar, Send, XCircle, Plus, Trash2,
  Package, CheckCircle2, Loader2, Sparkles, Download
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useEffect } from 'react';
import { generateCotacaoPdf } from '@/lib/cotacao-pdf';

interface ResponseItem {
  item_name: string;
  unit: string;
  qty: number;
  unit_price: number;
  vat_rate: number;
  lead_time_days: number;
  notes: string;
  source_pricebook_item_id?: string;
}

export default function FornecedorPedidoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: assignments = [] } = useSupplierQuoteRequests();
  const markViewed = useMarkQuoteViewed();
  const declineQuote = useDeclineQuote();
  const createResponse = useCreateQuoteResponse();
  const { data: pricebooks = [] } = useSupplierPricebooks();

  const [selectedPricebook, setSelectedPricebook] = useState<string>('');
  const [items, setItems] = useState<ResponseItem[]>([]);
  const [notes, setNotes] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const { data: pricebookItems = [] } = usePricebookItems(selectedPricebook || undefined);

  const assignment: any = assignments.find((a: any) => a.id === id);

  // Extract category IDs from the quote request
  const categoryIds = assignment?.quote_requests?.quote_request_categories
    ?.map((c: any) => c.category_id || c.supplier_categories?.id)
    .filter(Boolean) || [];

  const { data: matchedItems = [] } = useSupplierItemsByCategories(categoryIds);

  // Mark as viewed
  useEffect(() => {
    if (assignment && assignment.status === 'invited') {
      markViewed.mutate(assignment.id);
    }
  }, [assignment?.id, assignment?.status]);

  // Auto-fill items from pricebook when matched items load
  useEffect(() => {
    if (matchedItems.length > 0 && items.length === 0 && !autoFilled 
        && assignment?.status !== 'responded' && assignment?.status !== 'declined') {
      const prefilled: ResponseItem[] = matchedItems.map((pbItem: any) => ({
        item_name: pbItem.item_name,
        unit: pbItem.unit || 'un',
        qty: pbItem.min_qty || 1,
        unit_price: Number(pbItem.base_price) || 0,
        vat_rate: Number(pbItem.vat_rate) || 23,
        lead_time_days: pbItem.lead_time_days || 1,
        notes: pbItem.notes || '',
        source_pricebook_item_id: pbItem.id,
      }));
      setItems(prefilled);
      setAutoFilled(true);
    }
  }, [matchedItems, autoFilled, assignment?.status]);

  if (!assignment) {
    return (
      <SupplierLayout title="Pedido de Cotação">
        <div className="text-center py-16 text-muted-foreground">
          {assignments.length === 0 ? 'A carregar...' : 'Pedido não encontrado'}
        </div>
      </SupplierLayout>
    );
  }

  const qr = assignment.quote_requests;
  const cats = qr?.quote_request_categories?.map((c: any) => c.supplier_categories?.name).filter(Boolean) || [];
  const alreadyResponded = assignment.status === 'responded';
  const isDeclined = assignment.status === 'declined';

  const addItem = () => setItems([...items, {
    item_name: '', unit: 'un', qty: 1, unit_price: 0, vat_rate: 23, lead_time_days: 1, notes: ''
  }]);

  const updateItem = (i: number, field: keyof ResponseItem, value: any) => {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const addFromPricebook = (pbItem: any) => {
    setItems([...items, {
      item_name: pbItem.item_name,
      unit: pbItem.unit,
      qty: 1,
      unit_price: Number(pbItem.base_price),
      vat_rate: Number(pbItem.vat_rate),
      lead_time_days: pbItem.lead_time_days || 1,
      notes: pbItem.notes || '',
      source_pricebook_item_id: pbItem.id,
    }]);
  };

  const total = items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);

  const handleSubmit = () => {
    if (items.length === 0) return;
    createResponse.mutate({
      quoteRequestId: qr.id,
      quoteRequestSupplierId: assignment.id,
      form: {
        notes,
        estimated_delivery_days: deliveryDays ? parseInt(deliveryDays) : undefined,
        items,
      },
    }, { onSuccess: () => navigate('/fornecedor/pedidos') });
  };

  const handleDecline = () => {
    declineQuote.mutate(assignment.id, { onSuccess: () => navigate('/fornecedor/pedidos') });
  };

  return (
    <SupplierLayout title="Detalhe do Pedido" subtitle="Pedido de cotação recebido">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/fornecedor/pedidos')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar aos pedidos
        </Button>

        {/* Request details */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-lg">Pedido de Cotação</CardTitle>
              <Badge variant={alreadyResponded ? 'default' : isDeclined ? 'secondary' : 'outline'}>
                {alreadyResponded ? '✓ Respondido' : isDeclined ? 'Recusado' : 'Aguarda resposta'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Categories */}
            <div>
              <p className="text-sm font-medium mb-2">Categorias solicitadas</p>
              <div className="flex flex-wrap gap-2">
                {cats.map((cat: string) => (
                  <Badge key={cat} variant="secondary">{cat}</Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {(qr?.location_district || qr?.location_municipality) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{qr.location_district}{qr.location_municipality && `, ${qr.location_municipality}`}</span>
                </div>
              )}
              {qr?.requested_deadline && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Prazo: {format(new Date(qr.requested_deadline), "d 'de' MMMM yyyy", { locale: pt })}</span>
                </div>
              )}
            </div>

            {qr?.message_to_suppliers && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-1">Mensagem do construtor:</p>
                <p className="text-sm text-muted-foreground">{qr.message_to_suppliers}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response form */}
        {!alreadyResponded && !isDeclined && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">A sua Proposta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Import from pricebook */}
              {pricebooks.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                  <p className="text-sm font-medium">Importar da tabela de preços</p>
                  <div className="flex gap-2">
                    <Select value={selectedPricebook} onValueChange={setSelectedPricebook}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecionar tabela..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pricebooks.filter((pb: any) => pb.status === 'published').map((pb: any) => (
                          <SelectItem key={pb.id} value={pb.id}>{pb.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedPricebook && pricebookItems.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {pricebookItems.map((pbItem: any) => (
                        <div key={pbItem.id} className="flex items-center justify-between p-2 bg-background rounded border text-sm">
                          <span className="truncate">{pbItem.item_name} ({pbItem.unit})</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-muted-foreground">€{Number(pbItem.base_price).toFixed(2)}</span>
                            <Button size="sm" variant="ghost" onClick={() => addFromPricebook(pbItem)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Auto-fill banner */}
              {autoFilled && (
                <div className="flex items-center gap-3 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                  <Sparkles className="h-5 w-5 text-accent flex-shrink-0" />
                  <p className="text-sm text-accent">
                    <strong>Preenchimento automático:</strong> {items.length} artigo(s) importado(s) da sua tabela de preços. Revise as quantidades e preços antes de enviar.
                  </p>
                </div>
              )}

              {/* Items table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Artigos da proposta</p>
                  <Button size="sm" variant="outline" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar linha
                  </Button>
                </div>
                {items.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>Adicione artigos à proposta ou importe da tabela de preços</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 p-3 border rounded-lg">
                        <div className="col-span-12 sm:col-span-4">
                          <Input
                            placeholder="Nome do artigo"
                            value={item.item_name}
                            onChange={(e) => updateItem(i, 'item_name', e.target.value)}
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <Input
                            placeholder="Un."
                            value={item.unit}
                            onChange={(e) => updateItem(i, 'unit', e.target.value)}
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <Input
                            type="number"
                            placeholder="Qtd"
                            value={item.qty}
                            onChange={(e) => updateItem(i, 'qty', Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-3">
                          <Input
                            type="number"
                            placeholder="Preço unit. (€)"
                            value={item.unit_price}
                            onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-1 flex items-center justify-end">
                          <Button size="icon" variant="ghost" onClick={() => removeItem(i)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end p-3 bg-muted/50 rounded-lg">
                      <span className="font-semibold">Total: €{total.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prazo de entrega (dias)</Label>
                  <Input
                    type="number"
                    placeholder="ex: 15"
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  placeholder="Condições comerciais, prazo de validade da proposta, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={items.length === 0 || createResponse.isPending}
                >
                  {createResponse.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar Proposta
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  disabled={declineQuote.isPending}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Recusar Pedido
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {alreadyResponded && (
          <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg text-primary">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">Proposta enviada com sucesso. O construtor foi notificado.</p>
          </div>
        )}
      </div>
    </SupplierLayout>
  );
}
