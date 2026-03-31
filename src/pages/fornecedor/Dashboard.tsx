import { SupplierLayout } from '@/components/fornecedor/SupplierLayout';
import { useSupplierProfile } from '@/hooks/useSuppliers';
import { useSupplierQuoteRequests } from '@/hooks/useSuppliers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ClipboardList,
  Tag,
  Clock,
  CheckCircle2,
  TrendingUp,
  Eye,
  BarChart3,
  AlertCircle,
  ArrowRight,
  Star,
  ShieldCheck,
  Package,
  Zap,
  CalendarDays,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { PriceListUploadCard } from '@/components/fornecedor/PriceListUploadCard';
import { useSupplierPricebooks } from '@/hooks/useSuppliers';

export default function FornecedorDashboard() {
  const navigate = useNavigate();
  const { data: profile } = useSupplierProfile();
  const { data: assignments = [], isLoading } = useSupplierQuoteRequests();
  const { data: pricebooks = [] } = useSupplierPricebooks();

  const total = assignments.length;
  const newCount = assignments.filter((a: any) => a.status === 'invited').length;
  const viewedCount = assignments.filter((a: any) => a.status === 'viewed').length;
  const respondedCount = assignments.filter((a: any) => a.status === 'responded').length;
  const declinedCount = assignments.filter((a: any) => a.status === 'declined').length;
  const responseRate = total > 0 ? Math.round((respondedCount / total) * 100) : 0;

  const recent = assignments.slice(0, 5);
  const publishedPricebooks = pricebooks.filter((p: any) => p.status === 'published').length;

  // Profile completion
  const profileFields = [
    profile?.legal_name,
    profile?.nif,
    profile?.morada_completa,
    profile?.categoria_principal,
    profile?.cae_principal,
    profile?.logo_url,
    profile?.email_comercial,
    profile?.telemovel,
  ];
  const filledFields = profileFields.filter(Boolean).length;
  const profileCompletion = Math.round((filledFields / profileFields.length) * 100);

  const statusColors: Record<string, string> = {
    invited: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    viewed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    responded: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    declined: 'bg-muted text-muted-foreground border-muted',
    expired: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  const statusLabels: Record<string, string> = {
    invited: 'Novo',
    viewed: 'Visualizado',
    responded: 'Respondido',
    declined: 'Recusado',
    expired: 'Expirado',
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 19) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <SupplierLayout title="Dashboard" subtitle="Visão geral da sua atividade">
      {/* Welcome banner */}
      <div className="mb-6 p-5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {greeting()}, {profile?.trade_name || profile?.legal_name || 'Fornecedor'} 👋
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {newCount > 0
                ? `Tem ${newCount} pedido${newCount > 1 ? 's' : ''} novo${newCount > 1 ? 's' : ''} a aguardar resposta.`
                : 'Está tudo em dia. Continue a monitorizar a sua atividade.'}
            </p>
          </div>
          {profile?.is_certified && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary">Certificado</span>
            </div>
          )}
        </div>
      </div>

      {/* Pending validation alert */}
      {profile?.status === 'pending' && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-700 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Conta em validação</p>
            <p className="text-xs mt-0.5 opacity-80">A sua conta está a aguardar aprovação pela equipa ObraSys. Poderá receber pedidos assim que for aprovada.</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Pedidos</p>
                <p className="text-2xl font-bold text-foreground mt-1">{total}</p>
                <p className="text-xs text-muted-foreground mt-0.5">recebidos</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Novos</p>
                <p className="text-2xl font-bold text-foreground mt-1">{newCount}</p>
                <p className="text-xs text-amber-600 mt-0.5">aguardam resposta</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Respondidos</p>
                <p className="text-2xl font-bold text-foreground mt-1">{respondedCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{declinedCount} recusados</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxa Resposta</p>
                <p className="text-2xl font-bold text-foreground mt-1">{responseRate}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">{viewedCount} visualizados</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile completion + Pricebooks quick stats */}
      {profileCompletion < 100 && (
        <Card className="mb-6 border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-semibold text-foreground">Complete o seu perfil</p>
              </div>
              <span className="text-sm font-bold text-primary">{profileCompletion}%</span>
            </div>
            <Progress value={profileCompletion} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              Perfis completos têm maior visibilidade nos pedidos de cotação.
              <button onClick={() => navigate('/fornecedor/perfil')} className="text-primary font-medium ml-1 hover:underline">
                Completar agora →
              </button>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upload de Tabela de Preços */}
      <div className="mb-6">
        <PriceListUploadCard />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent requests */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Pedidos Recentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/fornecedor/pedidos')} className="text-primary hover:text-primary">
                Ver todos <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">A carregar...</div>
              ) : recent.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <ClipboardList className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Sem pedidos ainda</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Os pedidos de cotação aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recent.map((a: any) => {
                    const qr = a.quote_requests;
                    const cats = qr?.quote_request_categories?.map((c: any) => c.supplier_categories?.name).filter(Boolean) || [];
                    const timeAgo = a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: pt }) : '';
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-3 p-3.5 border rounded-xl hover:bg-muted/30 cursor-pointer transition-all hover:shadow-sm group"
                        onClick={() => navigate(`/fornecedor/pedidos/${a.id}`)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex flex-wrap gap-1">
                              {cats.slice(0, 2).map((cat: string) => (
                                <Badge key={cat} variant="secondary" className="text-xs font-medium">{cat}</Badge>
                              ))}
                              {cats.length > 2 && <Badge variant="secondary" className="text-xs">+{cats.length - 2}</Badge>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {qr?.location_district && (
                              <span>{qr.location_district}{qr.location_municipality && ` • ${qr.location_municipality}`}</span>
                            )}
                            {qr?.requested_deadline && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {format(new Date(qr.requested_deadline), "d MMM yyyy", { locale: pt })}
                                </span>
                              </>
                            )}
                            {timeAgo && (
                              <>
                                <span>•</span>
                                <span>{timeAgo}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs border flex-shrink-0 ${statusColors[a.status] || ''}`}>
                            {statusLabels[a.status] || a.status}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar cards */}
        <div className="space-y-4">
          {/* Quick actions */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start h-11" variant="outline" onClick={() => navigate('/fornecedor/pedidos')}>
                <ClipboardList className="h-4 w-4 mr-3 text-primary" />
                <span className="flex-1 text-left">Ver pedidos</span>
                {newCount > 0 && <Badge className="ml-auto bg-amber-500 text-white border-0 text-xs">{newCount}</Badge>}
              </Button>
              <Button className="w-full justify-start h-11" variant="outline" onClick={() => navigate('/fornecedor/precos')}>
                <Tag className="h-4 w-4 mr-3 text-primary" />
                <span className="flex-1 text-left">Gerir preços</span>
                <span className="text-xs text-muted-foreground">{publishedPricebooks} publicadas</span>
              </Button>
              <Button className="w-full justify-start h-11" variant="outline" onClick={() => navigate('/fornecedor/perfil')}>
                <Eye className="h-4 w-4 mr-3 text-primary" />
                <span className="flex-1 text-left">Editar perfil</span>
              </Button>
            </CardContent>
          </Card>

          {/* Profile summary */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Resumo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-dashed">
                <span className="text-sm text-muted-foreground">Estado</span>
                <Badge 
                  variant={profile?.status === 'active' ? 'default' : 'secondary'}
                  className={profile?.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' : ''}
                >
                  {profile?.status === 'active' ? '● Ativo' : profile?.status === 'pending' ? '◌ Pendente' : '○ Suspenso'}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dashed">
                <span className="text-sm text-muted-foreground">Certificado</span>
                <span className="text-sm font-medium">{profile?.is_certified ? '✅ Sim' : '—'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dashed">
                <span className="text-sm text-muted-foreground">SLA Resposta</span>
                <span className="text-sm font-semibold">{profile?.sla_response_hours ?? 48}h</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dashed">
                <span className="text-sm text-muted-foreground">Tabelas de Preços</span>
                <div className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold">{pricebooks.length}</span>
                </div>
              </div>
              {profile?.rating_avg !== undefined && profile?.rating_avg > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Avaliação</span>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-semibold">{profile.rating_avg.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({profile.rating_count})</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SupplierLayout>
  );
}
