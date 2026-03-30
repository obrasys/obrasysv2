import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClientPortalLayout } from '@/components/portal/ClientPortalLayout';
import { PortalProgressCard } from '@/components/portal/PortalProgressCard';
import { PortalRDOList } from '@/components/portal/PortalRDOList';
import { PortalPhotoGallery } from '@/components/portal/PortalPhotoGallery';
import { PortalActivityLog } from '@/components/portal/PortalActivityLog';
import { PortalPaymentsCard } from '@/components/portal/PortalPaymentsCard';
import { PortalPaymentAlertsCard } from '@/components/portal/PortalPaymentAlertsCard';
import { useClientObraDetail } from '@/hooks/useClientPortal';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, FileText, Camera, Activity, Calendar, MapPin, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const statusLabels: Record<string, string> = {
  planeamento: 'Planeamento',
  em_curso: 'Em Curso',
  pausada: 'Pausada',
  concluida: 'Concluída',
};

const statusColors: Record<string, string> = {
  planeamento: 'bg-muted text-muted-foreground',
  em_curso: 'bg-primary/10 text-primary',
  pausada: 'bg-destructive/10 text-destructive',
  concluida: 'bg-green-100 text-green-700',
};

const PortalObra = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    obra,
    obraLoading,
    progress,
    progressLoading,
    rdos,
    rdosLoading,
    paymentPlans,
    paymentsLoading,
    activityLogs,
    logEvent,
  } = useClientObraDetail(id);

  useEffect(() => {
    if (id) {
      logEvent.mutate({ eventType: 'portal_open' });
    }
  }, [id]);

  const handleLogEvent = (eventType: string, entityType?: string, entityId?: string) => {
    logEvent.mutate({ eventType: eventType as any, entityType, entityId });
  };

  if (obraLoading) {
    return (
      <ClientPortalLayout title="A carregar...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ClientPortalLayout>
    );
  }

  if (!obra) {
    return (
      <ClientPortalLayout title="Obra não encontrada">
        <div className="text-center py-20">
          <p className="text-muted-foreground">Não tem acesso a esta obra.</p>
        </div>
      </ClientPortalLayout>
    );
  }

  const rdosWithPhotos = (rdos || []).filter((r: any) => r.fotos && r.fotos.length > 0);
  const rdoCount = rdos?.length || 0;
  const photoCount = rdosWithPhotos.reduce((sum: number, r: any) => sum + (r.fotos?.length || 0), 0);
  const progressValue = Math.round(obra.progresso);
  const pendingPayments = (paymentPlans || []).filter((p: any) => p.status !== 'paid');

  // Circular progress for hero
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressValue / 100) * circumference;

  return (
    <ClientPortalLayout
      title={obra.nome}
      subtitle={obra.endereco || undefined}
      breadcrumbs={[{ label: obra.nome }]}
    >
      <div className="space-y-6">
        {/* Hero Stats Bar */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 sm:p-6">
              {/* Circular Progress */}
              <div className="relative h-24 w-24 shrink-0">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                  <circle
                    cx="48" cy="48" r={radius}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-foreground">{progressValue}%</span>
                  <span className="text-[10px] text-muted-foreground">concluído</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
                  <Badge className={`${statusColors[obra.status]} font-medium`}>
                    {statusLabels[obra.status] || obra.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {obra.data_inicio && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Início: {format(new Date(obra.data_inicio), 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                  {obra.data_fim && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Fim: {format(new Date(obra.data_fim), 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                  {obra.endereco && (
                    <div className="flex items-center gap-1.5 text-muted-foreground col-span-2 sm:col-span-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{obra.endereco}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex sm:flex-col gap-4 sm:gap-2 shrink-0 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{rdoCount}</p>
                  <p className="text-[11px] text-muted-foreground">Relatórios</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{photoCount}</p>
                  <p className="text-[11px] text-muted-foreground">Fotografias</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="progresso" className="space-y-4">
          <TabsList className="h-10 bg-card border border-border rounded-lg p-1 w-full grid grid-cols-5">
            <TabsTrigger value="progresso" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Progresso</span>
            </TabsTrigger>
            <TabsTrigger value="rdos" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">RDOs</span>
              {rdoCount > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px] hidden sm:flex">{rdoCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="pagamentos" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pagamentos</span>
              {pendingPayments.length > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px] hidden sm:flex">{pendingPayments.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="fotos" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <Camera className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Fotos</span>
              {photoCount > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px] hidden sm:flex">{photoCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="atividade" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Atividade</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="progresso">
            {progressLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <PortalProgressCard
                progresso={obra.progresso}
                updatedAt={obra.updated_at}
                milestones={(progress || []) as any}
              />
            )}
          </TabsContent>

          <TabsContent value="rdos">
            {rdosLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <PortalRDOList
                rdos={(rdos || []) as any}
                obraId={obra.id}
                obraNome={obra.nome}
                onLogEvent={handleLogEvent}
              />
            )}
          </TabsContent>

          <TabsContent value="pagamentos">
            {paymentsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <PortalPaymentsCard payments={(paymentPlans || []) as any} />
            )}
          </TabsContent>

          <TabsContent value="fotos">
            <PortalPhotoGallery rdos={rdosWithPhotos as any} onLogEvent={handleLogEvent} />
          </TabsContent>

          <TabsContent value="atividade">
            <PortalActivityLog logs={(activityLogs || []) as any} />
          </TabsContent>
        </Tabs>
      </div>
    </ClientPortalLayout>
  );
};

export default PortalObra;
