import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import {
  useCreateDirectQuoteResponse,
  useDeclineDirectQuote,
} from '@/hooks/useSupplierDirectQuotes';
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
  const { id: rawId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isDirect = rawId.startsWith('direct-');
  const directQrId = isDirect ? rawId.slice('direct-'.length) : '';

  const { data: assignments = [] } = useSupplierQuoteRequests();
  const markViewed = useMarkQuoteViewed();
  const declineQuote = useDeclineQuote();
  const createResponse = useCreateQuoteResponse();
  const createDirectResponse = useCreateDirectQuoteResponse();
  const declineDirect = useDeclineDirectQuote();
  const { data: pricebooks = [] } = useSupplierPricebooks();
  const { data: profile } = useSupplierProfile();
  const [selectedPricebook, setSelectedPricebook] = useState<string>('');
  const [items, setItems] = useState<ResponseItem[]>([]);
  const [notes, setNotes] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const { data: pricebookItems = [] } = usePricebookItems(selectedPricebook || undefined);

  // Direct quote: fetch the quote_request by id, then synthesize an assignment-shape.
  const { data: directQr } = useQuery({
    queryKey: ['supplier-direct-quote', directQrId, profile?.id],
    queryFn: async () => {
      if (!directQrId) return null;
      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          id, status, requested_deadline, message_to_suppliers, terms,
          delivery_location, location_district, location_municipality,
          fornecedor_id, organization_id, created_at,
          organizations:organization_id(name),
          quote_request_items(id, descricao, unidade, quantidade, codigo, capitulo),
          quote_responses(id, status, supplier_id)
        `)
        .eq('id', directQrId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isDirect && !!directQrId,
  });

  const assignment: any = useMemo(() => {
    if (isDirect) {
      if (!directQr) return null;
      const alreadyResponded = (directQr.quote_responses || []).some(
        (r: any) => r.supplier_id === profile?.id
      );
      return {
        id: `direct-${directQr.id}`,
        status: alreadyResponded ? 'responded' : 'invited',
        quote_requests: {
          ...directQr,
          quote_request_categories: [],
        },
      };
    }
    return assignments.find((a: any) => a.id === rawId);
  }, [isDirect, directQr, assignments, rawId, profile?.id]);

  // Extract category IDs from the quote request
  const categoryIds = assignment?.quote_requests?.quote_request_categories
    ?.map((c: any) => c.category_id || c.supplier_categories?.id)
    .filter(Boolean) || [];

  // Budget items sent with the quote request
  const budgetItems = assignment?.quote_requests?.quote_request_items || [];

  const { data: matchedItems = [] } = useSupplierItemsByCategories(categoryIds);

  // Mark as viewed (legacy assignment flow only)
  useEffect(() => {
    if (!isDirect && assignment && assignment.status === 'invited') {
      markViewed.mutate(assignment.id);
    }
  }, [assignment?.id, assignment?.status, isDirect]);

  // Auto-fill: use budget items and match prices from supplier pricebook
  useEffect(() => {
    if (items.length === 0 && !autoFilled 
        && assignment?.status !== 'responded' && assignment?.status !== 'declined') {
      
      if (budgetItems.length > 0) {
        // We have budget items - use them and try to match prices from supplier's pricebook
        const prefilled: ResponseItem[] = budgetItems.map((bi: any) => {
          // Try to find a matching pricebook item by name similarity
          const normalise = (s: string) => s.toLowerCase().replace(/[^a-záàâãéèêíïóôõúç\w\s]/g, '').trim();
          const biNorm = normalise(bi.descricao);
          const match = matchedItems.find((pb: any) => {
            const pbNorm = normalise(pb.item_name);
            return pbNorm === biNorm || pbNorm.includes(biNorm) || biNorm.includes(pbNorm);
          });

          return {
            item_name: bi.descricao,
            unit: bi.unidade || 'un',
            qty: Number(bi.quantidade) || 1,
            unit_price: match ? Number(match.base_price) : 0,
            vat_rate: match ? Number(match.vat_rate) : 23,
            lead_time_days: match?.lead_time_days || 1,
            notes: match ? `Preço da tabela: ${match.item_name}` : '',
            source_pricebook_item_id: match?.id || undefined,
          };
        });
        setItems(prefilled);
        setAutoFilled(true);
      } else if (matchedItems.length > 0) {
        // Fallback: no budget items, use pricebook items by category
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
    }
  }, [matchedItems, budgetItems, autoFilled, assignment?.status]);

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

  const handleDownloadPdf = () => {
    const location = [qr?.location_district, qr?.location_municipality].filter(Boolean).join(', ');
    const deadline = qr?.requested_deadline
      ? format(new Date(qr.requested_deadline), "d 'de' MMMM yyyy", { locale: pt })
      : undefined;
    
    const pdfDoc = generateCotacaoPdf({
      categories: cats,
      location: location || undefined,
      deadline,
      message: qr?.message_to_suppliers || undefined,
      items,
      notes,
      estimatedDeliveryDays: deliveryDays ? parseInt(deliveryDays) : undefined,
      supplierName: profile?.trade_name || profile?.legal_name || 'Fornecedor',
      supplierNif: profile?.nif || undefined,
      date: format(new Date(), "dd/MM/yyyy", { locale: pt }),
    });
    pdfDoc.save(`cotacao_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

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


            {/* Budget items requested */}
            {budgetItems.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Artigos do orçamento solicitados</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {budgetItems.some((bi: any) => bi.capitulo) && <th className="text-left p-2 font-medium">Capítulo</th>}
                        {budgetItems.some((bi: any) => bi.codigo) && <th className="text-left p-2 font-medium">Código</th>}
                        <th className="text-left p-2 font-medium">Descrição</th>
                        <th className="text-center p-2 font-medium">Un.</th>
                        <th className="text-right p-2 font-medium">Qtd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetItems.map((bi: any) => (
                        <tr key={bi.id} className="border-t">
                          {budgetItems.some((b: any) => b.capitulo) && <td className="p-2 text-muted-foreground">{bi.capitulo || '-'}</td>}
                          {budgetItems.some((b: any) => b.codigo) && <td className="p-2 text-muted-foreground">{bi.codigo || '-'}</td>}
                          <td className="p-2">{bi.descricao}</td>
                          <td className="p-2 text-center">{bi.unidade}</td>
                          <td className="p-2 text-right">{Number(bi.quantidade).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                    <strong>Preenchimento automático:</strong> {items.length} artigo(s) {budgetItems.length > 0 ? 'do orçamento importados com preços da sua tabela' : 'importado(s) da sua tabela de preços'}. Revise os valores antes de enviar.
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
                  onClick={handleDownloadPdf}
                  disabled={items.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
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
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg text-primary">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">Proposta enviada com sucesso. O construtor foi notificado.</p>
            </div>
            <Button variant="outline" onClick={handleDownloadPdf} disabled={items.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Proposta em PDF
            </Button>
          </div>
        )}
      </div>
    </SupplierLayout>
  );
}
