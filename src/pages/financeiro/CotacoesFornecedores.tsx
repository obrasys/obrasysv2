import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Search, Send, Inbox, CheckCircle2, XCircle, Award, Loader2, Plus, MailWarning } from 'lucide-react';
import {
  useFornecedorQuoteRequests,
  useSendDirectQuoteRequest,
  useCancelDirectQuoteRequest,
  useAwardDirectQuoteResponse,
} from '@/hooks/useFornecedorQuoteRequests';
import { DirectQuoteRequestModal } from '@/components/fornecedor/DirectQuoteRequestModal';

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'Rascunho', cls: 'bg-muted text-muted-foreground' },
  sent: { label: 'Enviado', cls: 'bg-accent/10 text-accent-foreground' },
  in_review: { label: 'Em análise', cls: 'bg-blue-500/10 text-blue-600' },
  closed: { label: 'Adjudicado', cls: 'bg-primary/10 text-primary' },
  cancelled: { label: 'Cancelado', cls: 'bg-destructive/10 text-destructive' },
};

export default function CotacoesFornecedoresPage() {
  const { data: requests, isLoading } = useFornecedorQuoteRequests();
  const send = useSendDirectQuoteRequest();
  const cancel = useCancelDirectQuoteRequest();
  const award = useAwardDirectQuoteResponse();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!requests) return [];
    return requests.filter((qr: any) => {
      if (statusFilter !== 'all' && qr.status !== statusFilter) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const nome = qr.fornecedores?.nome?.toLowerCase() || '';
        const orc = qr.orcamentos?.nome?.toLowerCase() || '';
        if (!nome.includes(s) && !orc.includes(s)) return false;
      }
      return true;
    });
  }, [requests, search, statusFilter]);

  const counts = useMemo(() => {
    const c = { all: 0, open: 0, sent: 0, in_review: 0, closed: 0, cancelled: 0 } as Record<string, number>;
    (requests || []).forEach((qr: any) => {
      c.all++;
      c[qr.status] = (c[qr.status] || 0) + 1;
    });
    return c;
  }, [requests]);

  return (
    <AppLayout title="Cotações a fornecedores">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Cotações a fornecedores</h1>
            <p className="text-muted-foreground text-sm">
              Pedidos diretos enviados aos seus fornecedores e respetivas respostas.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo pedido
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['all', 'open', 'sent', 'in_review', 'closed'] as const).map((key) => (
            <Card
              key={key}
              className={`cursor-pointer transition ${statusFilter === key ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setStatusFilter(key)}
            >
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  {key === 'all' ? 'Total' : STATUS[key]?.label}
                </div>
                <div className="text-2xl font-bold mt-1">{counts[key] || 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por fornecedor ou orçamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {Object.entries(STATUS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Inbox className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Sem pedidos</p>
              <p className="text-sm">Crie um novo pedido para enviar a um fornecedor.</p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {filtered.map((qr: any) => {
              const responses = qr.quote_responses || [];
              const status = STATUS[qr.status] || STATUS.open;
              return (
                <AccordionItem key={qr.id} value={qr.id} className="border rounded-lg bg-card">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex-1 flex items-center gap-3 flex-wrap text-left">
                      <Badge className={status.cls}>{status.label}</Badge>
                      <div className="flex-1">
                        <div className="font-semibold">{qr.fornecedores?.nome || 'Fornecedor'}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(qr.created_at), "d MMM yyyy", { locale: pt })}
                          {qr.orcamentos?.nome && ` · ${qr.orcamentos.nome}`}
                          {qr.requested_deadline && ` · prazo ${qr.requested_deadline}`}
                        </div>
                      </div>
                      <div className="text-xs text-right text-muted-foreground">
                        <div>{qr.quote_request_items?.length || 0} itens</div>
                        <div>{responses.length} resposta{responses.length === 1 ? '' : 's'}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    {qr.message_to_suppliers && (
                      <p className="text-sm bg-muted/40 rounded p-3">{qr.message_to_suppliers}</p>
                    )}

                    <div>
                      <div className="text-xs font-medium uppercase text-muted-foreground mb-1.5">
                        Itens
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="w-[80px]">Unid.</TableHead>
                            <TableHead className="w-[100px] text-right">Qtd</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {qr.quote_request_items?.map((it: any) => (
                            <TableRow key={it.id}>
                              <TableCell>{it.descricao}</TableCell>
                              <TableCell>{it.unidade}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {Number(it.quantidade).toLocaleString('pt-PT')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {responses.length > 0 && (
                      <div>
                        <div className="text-xs font-medium uppercase text-muted-foreground mb-1.5">
                          Respostas
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Estado</TableHead>
                              <TableHead className="text-right">Total (€)</TableHead>
                              <TableHead>Prazo</TableHead>
                              <TableHead>Notas</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {responses.map((resp: any) => (
                              <TableRow key={resp.id}>
                                <TableCell>
                                  <Badge variant={resp.status === 'accepted' ? 'default' : 'outline'}>
                                    {resp.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold tabular-nums">
                                  {resp.total_amount ? Number(resp.total_amount).toFixed(2) : '—'}
                                </TableCell>
                                <TableCell>
                                  {resp.estimated_delivery_days
                                    ? `${resp.estimated_delivery_days}d`
                                    : '—'}
                                </TableCell>
                                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                                  {resp.notes || '—'}
                                </TableCell>
                                <TableCell>
                                  {qr.status !== 'closed' && resp.status !== 'accepted' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => award.mutate({ responseId: resp.id, requestId: qr.id })}
                                      disabled={award.isPending}
                                    >
                                      <Award className="h-3.5 w-3.5 mr-1" /> Adjudicar
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <div className="flex gap-2 justify-end pt-1">
                      {qr.status === 'open' && (
                        <Button size="sm" onClick={() => send.mutate(qr.id)} disabled={send.isPending}>
                          {send.isPending ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          Enviar agora
                        </Button>
                      )}
                      {qr.status === 'sent' && !qr.fornecedores?.email && (
                        <div className="text-xs text-destructive flex items-center gap-1">
                          <MailWarning className="h-3.5 w-3.5" /> Fornecedor sem email
                        </div>
                      )}
                      {['open', 'sent', 'in_review'].includes(qr.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancel.mutate(qr.id)}
                          disabled={cancel.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Cancelar
                        </Button>
                      )}
                      {qr.status === 'closed' && (
                        <div className="text-xs text-primary flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Adjudicado
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        <DirectQuoteRequestModal open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </AppLayout>
  );
}
