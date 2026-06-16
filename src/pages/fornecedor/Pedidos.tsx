import { useState } from 'react';
import { SupplierLayout } from '@/components/fornecedor/SupplierLayout';
import {
  useSupplierQuoteRequests,
  useMarkQuoteViewed,
} from '@/hooks/useSuppliers';
import { useSupplierDirectQuoteRequests } from '@/hooks/useSupplierDirectQuotes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ClipboardList,
  Search,
  MapPin,
  Calendar,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
  invited: 'Novo',
  viewed: 'Visualizado',
  responded: 'Respondido',
  declined: 'Recusado',
  expired: 'Expirado',
  open: 'Novo',
  sent: 'Recebido',
  in_review: 'Respondido',
  closed: 'Adjudicado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  invited: 'bg-accent/10 text-accent border-accent/20',
  open: 'bg-accent/10 text-accent border-accent/20',
  sent: 'bg-accent/10 text-accent border-accent/20',
  viewed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  responded: 'bg-primary/10 text-primary border-primary/20',
  in_review: 'bg-primary/10 text-primary border-primary/20',
  closed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  declined: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
  expired: 'bg-destructive/10 text-destructive border-destructive/20',
};

type UnifiedRow = {
  routeId: string;
  kind: 'assignment' | 'direct';
  status: string;
  isNew: boolean;
  createdAt: string;
  builderName?: string;
  categories: string[];
  location?: string;
  deadline?: string;
  message?: string;
  rawAssignment?: any;
};

export default function FornecedorPedidos() {
  const navigate = useNavigate();
  const { data: assignments = [], isLoading: l1 } = useSupplierQuoteRequests();
  const { data: directs = [], isLoading: l2 } = useSupplierDirectQuoteRequests();
  const markViewed = useMarkQuoteViewed();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const rows: UnifiedRow[] = [
    ...(assignments as any[]).map((a: any): UnifiedRow => {
      const qr = a.quote_requests;
      return {
        routeId: a.id,
        kind: 'assignment',
        status: a.status,
        isNew: a.status === 'invited',
        createdAt: qr?.created_at || a.created_at,
        categories:
          qr?.quote_request_categories
            ?.map((c: any) => c.supplier_categories?.name)
            .filter(Boolean) || [],
        location:
          [qr?.location_district, qr?.location_municipality]
            .filter(Boolean)
            .join(', ') || undefined,
        deadline: qr?.requested_deadline || undefined,
        message: qr?.message_to_suppliers || undefined,
        rawAssignment: a,
      };
    }),
    ...(directs as any[]).map((qr: any): UnifiedRow => {
      const status = qr.already_responded ? 'responded' : qr.status;
      return {
        routeId: `direct-${qr.id}`,
        kind: 'direct',
        status,
        isNew: !qr.already_responded && (qr.status === 'open' || qr.status === 'sent'),
        createdAt: qr.created_at,
        builderName: qr.organizations?.name,
        categories: qr.orcamentos?.nome ? [qr.orcamentos.nome] : [],
        location: qr.delivery_location || undefined,
        deadline: qr.requested_deadline || undefined,
        message: qr.message_to_suppliers || undefined,
      };
    }),
  ].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const filtered = rows.filter((r) => {
    const hay = [r.categories.join(' '), r.location, r.builderName, r.message]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchSearch = !search || hay.includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleOpen = (r: UnifiedRow) => {
    if (r.kind === 'assignment' && r.status === 'invited' && r.rawAssignment) {
      markViewed.mutate(r.rawAssignment.id);
    }
    navigate(`/fornecedor/pedidos/${r.routeId}`);
  };

  const isLoading = l1 || l2;

  return (
    <SupplierLayout
      title="Pedidos de Cotação"
      subtitle="Pedidos recebidos de construtores"
    >
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por categoria, construtor ou local..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'invited', 'sent', 'responded', 'closed', 'declined'].map(
            (s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'Todos' : STATUS_LABELS[s] || s}
              </Button>
            )
          )}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          A carregar...
        </div>
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
          {filtered.map((r) => (
            <Card
              key={r.routeId}
              className={`cursor-pointer hover:shadow-md transition-all ${
                r.isNew ? 'border-accent/40' : ''
              }`}
              onClick={() => handleOpen(r)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {r.builderName && (
                      <div className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.builderName}
                      </div>
                    )}
                    {r.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {r.categories.map((cat) => (
                          <Badge
                            key={cat}
                            variant="secondary"
                            className="text-xs"
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {r.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {r.location}
                        </span>
                      )}
                      {r.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Prazo:{' '}
                          {format(new Date(r.deadline), 'd MMM yyyy', {
                            locale: pt,
                          })}
                        </span>
                      )}
                    </div>
                    {r.message && (
                      <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">
                        {r.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Badge
                      className={`text-xs border ${
                        STATUS_COLORS[r.status] || ''
                      }`}
                    >
                      {r.isNew && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent mr-1.5 animate-pulse" />
                      )}
                      {STATUS_LABELS[r.status] || r.status}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </SupplierLayout>
  );
}
