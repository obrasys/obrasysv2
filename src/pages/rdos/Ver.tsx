import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RDOStatusBadge, RDOImageGallery, RDOPdfExport } from '@/components/rdos';
import { KpiCard } from '@/components/relatorios/KpiCard';
import { useRDO, useRDOs } from '@/hooks/useRDOs';
import { 
  ArrowLeft, Edit, Send, Check, Calendar, HardHat, Cloud, Users,
  FileText, AlertTriangle, MessageSquare, AlertCircle, Ruler, Camera,
  Clock, Thermometer,
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
        <div className="p-4 md:p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-48" />
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

  const totalQuantificados = rdo.trabalhos_quantificados?.length || 0;
  const totalFotos = rdo.fotos?.length || 0;

  return (
    <AppLayout
      title={`RDO — ${rdo.obra?.nome || 'Obra'}`}
      subtitle={format(new Date(rdo.data), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/rdos')}>
            <ArrowLeft className="w-4 h-4 mr-1" />Voltar
          </Button>
          <RDOPdfExport rdo={rdo} />
          {rdo.status === 'rascunho' && (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(`/rdos/${id}/editar`)}>
                <Edit className="w-4 h-4 mr-1" />Editar
              </Button>
              <Button size="sm" onClick={() => submitRDO.mutate(rdo.id)}>
                <Send className="w-4 h-4 mr-1" />Submeter
              </Button>
            </>
          )}
          {rdo.status === 'submetido' && (
            <Button size="sm" onClick={() => approveRDO.mutate(rdo.id)}>
              <Check className="w-4 h-4 mr-1" />Aprovar
            </Button>
          )}
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-5">
        {/* Hero: Status + Obra link */}
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <RDOStatusBadge status={rdo.status} />
              <span
                className="text-sm text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors truncate"
                onClick={() => navigate(`/obras/${rdo.obra_id}`)}
              >
                <HardHat className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{rdo.obra?.nome}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Criado em {format(new Date(rdo.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
              {rdo.aprovado_em && ` · Aprovado em ${format(new Date(rdo.aprovado_em), "dd/MM/yyyy", { locale: pt })}`}
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            title="Data"
            value={format(new Date(rdo.data), "dd MMM yyyy", { locale: pt })}
            icon={Calendar}
            description={format(new Date(rdo.data), "EEEE", { locale: pt })}
            iconClassName="bg-primary/10"
          />
          <KpiCard
            title="Meteorologia"
            value={getCondLabel(rdo.condicoes_meteorologicas) || '—'}
            icon={Thermometer}
            iconClassName="bg-blue-500/10"
          />
          <KpiCard
            title="Mão de Obra"
            value={`${rdo.mao_de_obra_presente || 0}`}
            icon={Users}
            description="trabalhadores presentes"
            iconClassName="bg-emerald-500/10"
          />
          <KpiCard
            title="Trabalhos Quant."
            value={totalQuantificados}
            icon={Ruler}
            description={totalFotos > 0 ? `${totalFotos} foto(s)` : 'Sem fotos'}
            iconClassName="bg-amber-500/10"
          />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Trabalhos Executados */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Trabalhos Executados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rdo.trabalhos_executados ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{rdo.trabalhos_executados}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nenhum trabalho registado</p>
              )}
            </CardContent>
          </Card>

          {/* Trabalhos Quantificados */}
          {totalQuantificados > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-primary" />
                  Trabalhos Quantificados
                  <Badge variant="secondary" className="text-[10px] h-5 ml-1">{totalQuantificados}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {rdo.trabalhos_quantificados!.map((trabalho, index) => (
                    <div
                      key={trabalho.id || index}
                      className="flex items-center justify-between py-2 px-2.5 rounded-md hover:bg-muted/50 transition-colors border-b last:border-0"
                    >
                      <span className="text-sm">{trabalho.descricao}</span>
                      <Badge variant="outline" className="text-[11px] font-mono shrink-0 ml-3">
                        {trabalho.quantidade} {trabalho.unidade}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ocorrências + Observações side by side */}
          {rdo.ocorrencias && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Ocorrências
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{rdo.ocorrencias}</p>
              </CardContent>
            </Card>
          )}

          {rdo.observacoes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{rdo.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Fotos */}
        {totalFotos > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                Registo Fotográfico
                <Badge variant="secondary" className="text-[10px] h-5 ml-1">{totalFotos}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RDOImageGallery photos={rdo.fotos!} />
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return <FileText className={className} />;
}
