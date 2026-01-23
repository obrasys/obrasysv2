import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { RDOStatusBadge, RDOImageGallery, RDOPdfExport } from '@/components/rdos';
import { useRDO, useRDOs } from '@/hooks/useRDOs';
import { 
  ArrowLeft, 
  Edit, 
  Send,
  Check,
  Calendar,
  HardHat,
  Cloud,
  Users,
  FileText,
  AlertTriangle,
  MessageSquare,
  AlertCircle,
  Ruler,
  Camera,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CONDICOES_METEOROLOGICAS } from '@/types/rdos';

export default function VerRDOPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { rdo, isLoading } = useRDO(id);
  const { submitRDO, approveRDO } = useRDOs();

  const getCondLabel = (value: string | null) => {
    if (!value) return null;
    const cond = CONDICOES_METEOROLOGICAS.find(c => c.value === value);
    return cond?.label || value;
  };

  if (isLoading) {
    return (
      <AppLayout title="RDO">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!rdo) {
    return (
      <AppLayout title="RDO não encontrado">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">RDO não encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              O relatório que procura não existe ou foi eliminado.
            </p>
            <Button className="mt-4" onClick={() => navigate('/rdos')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à lista
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`RDO - ${rdo.obra?.nome}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/rdos')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {format(new Date(rdo.data), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                </h1>
                <RDOStatusBadge status={rdo.status} />
              </div>
              <p 
                className="text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground"
                onClick={() => navigate(`/obras/${rdo.obra_id}`)}
              >
                <HardHat className="h-4 w-4" />
                {rdo.obra?.nome}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <RDOPdfExport rdo={rdo} />
            {rdo.status === 'rascunho' && (
              <>
                <Button variant="outline" onClick={() => navigate(`/rdos/${id}/editar`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button onClick={() => submitRDO.mutate(rdo.id)}>
                  <Send className="mr-2 h-4 w-4" />
                  Submeter
                </Button>
              </>
            )}
            {rdo.status === 'submetido' && (
              <Button onClick={() => approveRDO.mutate(rdo.id)}>
                <Check className="mr-2 h-4 w-4" />
                Aprovar
              </Button>
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium capitalize">
                    {format(new Date(rdo.data), "EEEE, d 'de' MMMM", { locale: pt })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Cloud className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Condições Meteorológicas</p>
                  <p className="font-medium">
                    {getCondLabel(rdo.condicoes_meteorologicas) || 'Não registado'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Mão de Obra</p>
                  <p className="font-medium">
                    {rdo.mao_de_obra_presente || 0} trabalhadores
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trabalhos Executados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Trabalhos Executados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rdo.trabalhos_executados ? (
              <p className="whitespace-pre-wrap">{rdo.trabalhos_executados}</p>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum trabalho registado</p>
            )}
          </CardContent>
        </Card>

        {/* Trabalhos Quantificados */}
        {rdo.trabalhos_quantificados && rdo.trabalhos_quantificados.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Trabalhos Quantificados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rdo.trabalhos_quantificados.map((trabalho, index) => (
                  <div 
                    key={trabalho.id || index} 
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span>{trabalho.descricao}</span>
                    <Badge variant="secondary">
                      {trabalho.quantidade} {trabalho.unidade}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ocorrências */}
        {rdo.ocorrencias && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Ocorrências
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{rdo.ocorrencias}</p>
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        {rdo.observacoes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Observações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{rdo.observacoes}</p>
            </CardContent>
          </Card>
        )}

        {/* Fotos */}
        {rdo.fotos && rdo.fotos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Fotos da Obra ({rdo.fotos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RDOImageGallery photos={rdo.fotos} />
            </CardContent>
          </Card>
        )}

        {/* Audit Info */}
        <div className="text-sm text-muted-foreground">
          <p>Criado em {format(new Date(rdo.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}</p>
          {rdo.aprovado_em && (
            <p>Aprovado em {format(new Date(rdo.aprovado_em), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
