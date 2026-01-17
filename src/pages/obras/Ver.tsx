import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Edit, 
  MapPin, 
  Calendar, 
  Building2, 
  FileText,
  Plus,
  Loader2 
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ObraStatusBadge } from '@/components/obras/ObraStatusBadge';
import { ObraProgressTracker } from '@/components/obras/ObraProgressTracker';
import { useObra } from '@/hooks/useObras';
import type { ObraStatus } from '@/types/obras';

export default function VerObraPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    obra, 
    progressTracking, 
    isLoading, 
    createProgressItem, 
    updateProgressItem, 
    deleteProgressItem 
  } = useObra(id);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  if (isLoading) {
    return (
      <AppLayout title="A carregar...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!obra) {
    return (
      <AppLayout title="Obra não encontrada">
        <div className="p-6 text-center">
          <p className="text-muted-foreground">A obra solicitada não foi encontrada.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/obras')}>
            Voltar às Obras
          </Button>
        </div>
      </AppLayout>
    );
  }

  const valorOrcamentos = obra.orcamentos?.reduce((sum, orc) => sum + (orc.valor_total || 0), 0) || 0;

  return (
    <AppLayout
      title={obra.nome}
      subtitle={obra.cliente || 'Sem cliente atribuído'}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/obras')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={() => navigate(`/obras/${id}/editar`)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        {/* Header Info */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info Card */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Informações da Obra
                </CardTitle>
              </div>
              <ObraStatusBadge status={obra.status as ObraStatus} />
            </CardHeader>
            <CardContent className="space-y-4">
              {obra.endereco && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span>{obra.endereco}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  {obra.data_inicio 
                    ? format(new Date(obra.data_inicio), "dd 'de' MMMM 'de' yyyy", { locale: pt })
                    : 'Data de início não definida'
                  }
                  {obra.data_fim && (
                    <> → {format(new Date(obra.data_fim), "dd 'de' MMMM 'de' yyyy", { locale: pt })}</>
                  )}
                </span>
              </div>

              {/* Progress Overview */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Progresso Geral</span>
                  <span className="text-lg font-bold">{Math.round(obra.progresso || 0)}%</span>
                </div>
                <Progress value={obra.progresso || 0} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* KPIs Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Valor Previsto</p>
                <p className="text-xl font-bold">{formatCurrency(obra.valor_previsto || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Orçamentado</p>
                <p className="text-xl font-bold">{formatCurrency(valorOrcamentos)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orçamentos</p>
                <p className="text-xl font-bold">{obra.orcamentos?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Tracker */}
        <ObraProgressTracker
          progressItems={progressTracking || []}
          onAdd={createProgressItem.mutate}
          onUpdate={updateProgressItem.mutate}
          onDelete={deleteProgressItem.mutate}
          isLoading={createProgressItem.isPending || updateProgressItem.isPending}
        />

        {/* Linked Budgets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Orçamentos Associados
            </CardTitle>
            <Button 
              size="sm" 
              onClick={() => navigate(`/orcamentos/criar?obra_id=${id}`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Orçamento
            </Button>
          </CardHeader>
          <CardContent>
            {obra.orcamentos && obra.orcamentos.length > 0 ? (
              <div className="space-y-2">
                {obra.orcamentos.map((orcamento) => (
                  <div 
                    key={orcamento.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/orcamentos/${orcamento.id}/editar`)}
                  >
                    <div>
                      <p className="font-medium">{orcamento.titulo}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(orcamento.valor_total || 0)}
                      </p>
                    </div>
                    <Badge variant="outline">{orcamento.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum orçamento associado a esta obra.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate(`/orcamentos/criar?obra_id=${id}`)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Orçamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
