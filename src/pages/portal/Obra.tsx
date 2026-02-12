import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClientPortalLayout } from '@/components/portal/ClientPortalLayout';
import { PortalProgressCard } from '@/components/portal/PortalProgressCard';
import { PortalRDOList } from '@/components/portal/PortalRDOList';
import { PortalPhotoGallery } from '@/components/portal/PortalPhotoGallery';
import { PortalActivityLog } from '@/components/portal/PortalActivityLog';
import { useClientObraDetail } from '@/hooks/useClientPortal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

const statusLabels: Record<string, string> = {
  planeamento: 'Planeamento',
  em_curso: 'Em Curso',
  pausada: 'Pausada',
  concluida: 'Concluída',
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
    activityLogs,
    logEvent,
  } = useClientObraDetail(id);

  useEffect(() => {
    if (id) {
      logEvent.mutate({ eventType: 'portal_open' });
    }
  }, [id]);

  const handleLogEvent = (eventType: string, entityType?: string, entityId?: string) => {
    logEvent.mutate({
      eventType: eventType as any,
      entityType,
      entityId,
    });
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
          <Button variant="outline" className="mt-4" onClick={() => navigate('/portal')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </ClientPortalLayout>
    );
  }

  const rdosWithPhotos = (rdos || []).filter((r: any) => r.fotos && r.fotos.length > 0);

  return (
    <ClientPortalLayout
      title={obra.nome}
      subtitle={obra.endereco || undefined}
    >
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/portal')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Obras
        </Button>
        <Badge variant="secondary">
          {statusLabels[obra.status] || obra.status}
        </Badge>
      </div>

      <Tabs defaultValue="progresso" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progresso">Progresso</TabsTrigger>
          <TabsTrigger value="rdos">RDOs</TabsTrigger>
          <TabsTrigger value="fotos">Fotografias</TabsTrigger>
          <TabsTrigger value="atividade">Atividade</TabsTrigger>
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

        <TabsContent value="fotos">
          <PortalPhotoGallery
            rdos={rdosWithPhotos as any}
            onLogEvent={handleLogEvent}
          />
        </TabsContent>

        <TabsContent value="atividade">
          <PortalActivityLog logs={(activityLogs || []) as any} />
        </TabsContent>
      </Tabs>
    </ClientPortalLayout>
  );
};

export default PortalObra;
