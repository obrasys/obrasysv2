import { useState } from 'react';
import { SupplierLayout } from '@/components/fornecedor/SupplierLayout';
import { useSupplierQuoteRequests, useMarkQuoteViewed, useDeclineQuote } from '@/hooks/useSuppliers';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClipboardList, Search, MapPin, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
  invited: 'Novo',
  viewed: 'Visualizado',
  responded: 'Respondido',
  declined: 'Recusado',
  expired: 'Expirado',
};

const STATUS_COLORS: Record<string, string> = {
  invited: 'bg-accent/10 text-accent border-accent/20',
  viewed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  responded: 'bg-primary/10 text-primary border-primary/20',
  declined: 'bg-muted text-muted-foreground',
  expired: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function FornecedorPedidos() {
  const navigate = useNavigate();
  const { data: assignments = [], isLoading } = useSupplierQuoteRequests();
  const markViewed = useMarkQuoteViewed();
  const declineQuote = useDeclineQuote();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = assignments.filter((a: any) => {
    const qr = a.quote_requests;
    const cats = qr?.quote_request_categories?.map((c: any) => c.supplier_categories?.name).join(' ') || '';
    const matchSearch =
      !search ||
      cats.toLowerCase().includes(search.toLowerCase()) ||
      qr?.location_district?.toLowerCase().includes(search.toLowerCase()) ||
      qr?.location_municipality?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleOpen = (a: any) => {
    if (a.status === 'invited') {
      markViewed.mutate(a.id);
    }
    navigate(`/fornecedor/pedidos/${a.id}`);
  };

  return (
    <SupplierLayout title="Pedidos de Cotação" subtitle="Pedidos recebidos de construtores">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por categoria ou local..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'invited', 'viewed', 'responded', 'declined'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">A carregar...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Sem pedidos</p>
          <p className="text-sm mt-1">
            {search || statusFilter !== 'all'
              ? 'Tente outros filtros'
              : 'Os pedidos de cotação aparecerão aqui'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a: any) => {
            const qr = a.quote_requests;
            const cats = qr?.quote_request_categories?.map((c: any) => c.supplier_categories?.name).filter(Boolean) || [];
            return (
              <Card
                key={a.id}
                className={`cursor-pointer hover:shadow-md transition-all ${a.status === 'invited' ? 'border-accent/40' : ''}`}
                onClick={() => handleOpen(a)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {cats.map((cat: string) => (
                          <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {(qr?.location_district || qr?.location_municipality) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {qr.location_district}{qr.location_municipality && `, ${qr.location_municipality}`}
                          </span>
                        )}
                        {qr?.requested_deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Prazo: {format(new Date(qr.requested_deadline), "d MMM yyyy", { locale: pt })}
                          </span>
                        )}
                      </div>
                      {qr?.message_to_suppliers && (
                        <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">
                          {qr.message_to_suppliers}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge className={`text-xs border ${STATUS_COLORS[a.status] || ''}`}>
                        {a.status === 'invited' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent mr-1.5 animate-pulse" />}
                        {STATUS_LABELS[a.status]}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </SupplierLayout>
  );
}
