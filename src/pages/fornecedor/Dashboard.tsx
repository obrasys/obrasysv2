import { SupplierLayout } from '@/components/fornecedor/SupplierLayout';
import { useSupplierProfile } from '@/hooks/useSuppliers';
import { useSupplierQuoteRequests } from '@/hooks/useSuppliers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, Tag, Clock, CheckCircle2, XCircle, Eye, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { PriceListUploadCard } from '@/components/fornecedor/PriceListUploadCard';

export default function FornecedorDashboard() {
  const navigate = useNavigate();
  const { data: profile } = useSupplierProfile();
  const { data: assignments = [], isLoading } = useSupplierQuoteRequests();

  const total = assignments.length;
  const newCount = assignments.filter((a: any) => a.status === 'invited').length;
  const viewedCount = assignments.filter((a: any) => a.status === 'viewed').length;
  const respondedCount = assignments.filter((a: any) => a.status === 'responded').length;
  const declinedCount = assignments.filter((a: any) => a.status === 'declined').length;
  const responseRate = total > 0 ? Math.round((respondedCount / total) * 100) : 0;

  const recent = assignments.slice(0, 5);

  const statusColors: Record<string, string> = {
    invited: 'bg-accent/10 text-accent border-accent/20',
    viewed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    responded: 'bg-primary/10 text-primary border-primary/20',
    declined: 'bg-muted text-muted-foreground',
    expired: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  const statusLabels: Record<string, string> = {
    invited: 'Novo',
    viewed: 'Visualizado',
    responded: 'Respondido',
    declined: 'Recusado',
    expired: 'Expirado',
  };

  return (
    <SupplierLayout title="Dashboard" subtitle="Visão geral da sua atividade">
      {profile?.status === 'pending' && (
        <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded-lg text-sm text-accent">
          ⏳ A sua conta está a aguardar validação pela equipa ObraSys. Poderá receber pedidos assim que for aprovada.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Novos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{newCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Respondidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{respondedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Taxa Resposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responseRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Upload de Tabela de Preços - Destaque */}
      <div className="mb-6">
        <PriceListUploadCard />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent requests */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Pedidos Recentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/fornecedor/pedidos')}>
                Ver todos
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">A carregar...</div>
              ) : recent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Sem pedidos ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recent.map((a: any) => {
                    const qr = a.quote_requests;
                    const cats = qr?.quote_request_categories?.map((c: any) => c.supplier_categories?.name).filter(Boolean) || [];
                    return (
                      <div
                        key={a.id}
                        className="flex items-start justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/fornecedor/pedidos/${a.id}`)}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-1 mb-1">
                            {cats.slice(0, 2).map((cat: string) => (
                              <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                            ))}
                            {cats.length > 2 && <Badge variant="secondary" className="text-xs">+{cats.length - 2}</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {qr?.location_district}{qr?.location_municipality && ` • ${qr.location_municipality}`}
                          </p>
                          {qr?.requested_deadline && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Prazo: {format(new Date(qr.requested_deadline), "d MMM yyyy", { locale: pt })}
                            </p>
                          )}
                        </div>
                        <Badge className={`text-xs border flex-shrink-0 ${statusColors[a.status] || ''}`}>
                          {statusLabels[a.status] || a.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/fornecedor/pedidos')}>
                <ClipboardList className="h-4 w-4 mr-2" />
                Ver pedidos {newCount > 0 && <Badge className="ml-auto bg-accent text-accent-foreground">{newCount}</Badge>}
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/fornecedor/precos')}>
                <Tag className="h-4 w-4 mr-2" />
                Gerir preços
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/fornecedor/perfil')}>
                <Eye className="h-4 w-4 mr-2" />
                Editar perfil
              </Button>
            </CardContent>
          </Card>

          {/* Profile status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estado do Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado</span>
                <Badge variant={profile?.status === 'active' ? 'default' : 'secondary'}>
                  {profile?.status === 'active' ? 'Ativo' : profile?.status === 'pending' ? 'Pendente' : 'Suspenso'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Certificado</span>
                <span>{profile?.is_certified ? '✅ Sim' : '❌ Não'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SLA Resposta</span>
                <span>{profile?.sla_response_hours ?? 48}h</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SupplierLayout>
  );
}
