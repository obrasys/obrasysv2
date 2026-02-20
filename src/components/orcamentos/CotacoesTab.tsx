import { useState } from 'react';
import { useQuoteRequests, useCreateQuoteRequest, useAvailableSuppliers, useSupplierCategories } from '@/hooks/useSuppliers';
import { SupplierReviewDialog } from '@/components/fornecedor/SupplierReviewDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Store, Plus, Send, Clock, Eye, CheckCircle2, XCircle, Loader2, MapPin, ShieldCheck, Star } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface CotacoesTabProps {
  orcamentoId: string;
  obraId?: string;
  locationDistrict?: string;
  locationMunicipality?: string;
}

const STATUS_COLORS: Record<string, string> = {
  invited: 'bg-accent/10 text-accent',
  viewed: 'bg-blue-500/10 text-blue-500',
  responded: 'bg-primary/10 text-primary',
  declined: 'bg-muted text-muted-foreground',
};
const STATUS_LABELS: Record<string, string> = {
  invited: 'Enviado',
  viewed: 'Visualizou',
  responded: 'Respondeu',
  declined: 'Recusou',
};

export function CotacoesTab({ orcamentoId, obraId, locationDistrict, locationMunicipality }: CotacoesTabProps) {
  const { data: requests = [], isLoading } = useQuoteRequests(orcamentoId);
  const { data: categories = [] } = useSupplierCategories();
  const createRequest = useCreateQuoteRequest();

  const [showDialog, setShowDialog] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [message, setMessage] = useState('');
  const [reviewTarget, setReviewTarget] = useState<{ supplierId: string; supplierName: string; quoteRequestId: string } | null>(null);

  const { data: availableSuppliers = [] } = useAvailableSuppliers(selectedCategories);

  const toggleCategory = (id: string) => setSelectedCategories((p) => p.includes(id) ? p.filter((c) => c !== id) : [...p, id]);
  const toggleSupplier = (id: string) => setSelectedSuppliers((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);

  const handleSend = () => {
    createRequest.mutate({
      form: { category_ids: selectedCategories, supplier_ids: selectedSuppliers, requested_deadline: deadline, message_to_suppliers: message },
      budgetId: orcamentoId,
      projectId: obraId,
      locationDistrict,
      locationMunicipality,
    }, {
      onSuccess: () => {
        setShowDialog(false);
        setSelectedCategories([]); setSelectedSuppliers([]); setDeadline(''); setMessage('');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Cotações a Fornecedores</h3>
          <p className="text-sm text-muted-foreground">Solicite propostas da rede de fornecedores certificados</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Solicitar Cotação
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg text-muted-foreground">
          <Store className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sem pedidos de cotação</p>
          <p className="text-sm mt-1">Clique em "Solicitar Cotação" para pedir propostas a fornecedores</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((qr: any) => {
            const cats = qr.quote_request_categories?.map((c: any) => c.supplier_categories?.name).filter(Boolean) || [];
            const suppliers = qr.quote_request_suppliers || [];
            const responses = qr.quote_responses || [];
            const viewedCount = suppliers.filter((s: any) => ['viewed', 'responded'].includes(s.status)).length;
            const respondedCount = suppliers.filter((s: any) => s.status === 'responded').length;

            return (
              <Card key={qr.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {cats.map((cat: string) => <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>)}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(qr.created_at), "d MMM yyyy", { locale: pt })}</span>
                        {qr.requested_deadline && <span>Prazo: {format(new Date(qr.requested_deadline), "d MMM yyyy", { locale: pt })}</span>}
                      </div>
                    </div>
                    <div className="text-sm text-right text-muted-foreground flex-shrink-0">
                      <p><strong>{suppliers.length}</strong> enviados</p>
                      <p><Eye className="h-3 w-3 inline mr-1" />{viewedCount} viram</p>
                      <p><CheckCircle2 className="h-3 w-3 inline mr-1 text-primary" />{respondedCount} responderam</p>
                    </div>
                  </div>
                </CardHeader>

                {responses.length > 0 && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <p className="text-sm font-medium mb-3">Comparativo de Propostas</p>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Prazo</TableHead>
                            <TableHead>Observações</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {responses.map((resp: any) => (
                            <TableRow key={resp.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{resp.supplier_profiles?.trade_name || resp.supplier_profiles?.legal_name}</span>
                                  {resp.supplier_profiles?.is_certified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold">€{Number(resp.total_amount).toFixed(2)}</TableCell>
                              <TableCell className="text-right">{resp.estimated_delivery_days ? `${resp.estimated_delivery_days}d` : '—'}</TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{resp.notes || '—'}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 text-xs"
                                  onClick={() => setReviewTarget({
                                    supplierId: resp.supplier_id,
                                    supplierName: resp.supplier_profiles?.trade_name || resp.supplier_profiles?.legal_name || 'Fornecedor',
                                    quoteRequestId: qr.id,
                                  })}
                                >
                                  <Star className="h-3 w-3" />
                                  Avaliar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Store className="h-5 w-5" />Solicitar Cotação</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium mb-3 block">Categorias a cotar</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat: any) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <Checkbox id={`c-${cat.id}`} checked={selectedCategories.includes(cat.id)} onCheckedChange={() => toggleCategory(cat.id)} />
                    <label htmlFor={`c-${cat.id}`} className="text-sm cursor-pointer">{cat.name}</label>
                  </div>
                ))}
              </div>
            </div>

            {selectedCategories.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  Fornecedores disponíveis ({availableSuppliers.length})
                </Label>
                {availableSuppliers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum fornecedor certificado para estas categorias ainda.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {availableSuppliers.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <Checkbox id={`s-${s.id}`} checked={selectedSuppliers.includes(s.id)} onCheckedChange={() => toggleSupplier(s.id)} />
                        <label htmlFor={`s-${s.id}`} className="flex items-center gap-2 cursor-pointer text-sm flex-1">
                          <span>{s.trade_name || s.legal_name}</span>
                          {s.is_certified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                          {s.location_district && <span className="text-muted-foreground flex items-center gap-0.5"><MapPin className="h-3 w-3" />{s.location_district}</span>}
                          <span className="ml-auto text-muted-foreground">SLA: {s.sla_response_hours}h</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label>Prazo para receber proposta</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Mensagem aos fornecedores (opcional)</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Informações adicionais sobre o pedido..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleSend}
              disabled={selectedCategories.length === 0 || selectedSuppliers.length === 0 || !deadline || createRequest.isPending}
            >
              {createRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar para {selectedSuppliers.length} fornecedor{selectedSuppliers.length !== 1 ? 'es' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reviewTarget && (
        <SupplierReviewDialog
          open={!!reviewTarget}
          onOpenChange={(v) => !v && setReviewTarget(null)}
          supplierId={reviewTarget.supplierId}
          supplierName={reviewTarget.supplierName}
          quoteRequestId={reviewTarget.quoteRequestId}
        />
      )}
    </div>
  );
}
