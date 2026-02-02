import { useNavigate, useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AutoMedicaoStatusBadge, 
  AutoMedicaoItemsTable,
  AutoMedicaoPdfExport 
} from '@/components/autos-medicao';
import { useAutoMedicao, useAutosMedicao } from '@/hooks/useAutosMedicao';
import { useFormatting } from '@/hooks/useFormatting';
import { 
  ArrowLeft, 
  Pencil, 
  Calendar, 
  MapPin, 
  User, 
  Building2,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function VerAutoMedicaoPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: auto, isLoading } = useAutoMedicao(id);
  const { updateEstado, addItem, updateItem, deleteItem } = useAutosMedicao();
  const { formatCurrency, formatDate } = useFormatting();

  if (isLoading) {
    return (
      <AppLayout title="A carregar..." subtitle="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!auto) {
    return (
      <AppLayout title="Não encontrado" subtitle="">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Auto de medição não encontrado</p>
          <Button className="mt-4" onClick={() => navigate('/autos-medicao')}>
            Voltar à lista
          </Button>
        </div>
      </AppLayout>
    );
  }

  const canEdit = auto.estado === 'rascunho';
  const canSubmit = auto.estado === 'rascunho' && (auto.itens?.length || 0) > 0;

  const handleSubmit = () => {
    if (id) {
      updateEstado({ id, estado: 'submetido' });
    }
  };

  const handleValidate = () => {
    if (id) {
      updateEstado({ id, estado: 'validado' });
    }
  };

  const handleApprove = () => {
    if (id) {
      updateEstado({ id, estado: 'aprovado' });
    }
  };

  return (
    <AppLayout title={`Auto de Medição nº ${auto.numero_auto}`} subtitle={auto.obra?.nome || ''}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Auto de Medição nº {auto.numero_auto}</h1>
                <AutoMedicaoStatusBadge estado={auto.estado} />
              </div>
              <p className="text-muted-foreground mt-1">{auto.obra?.nome}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <AutoMedicaoPdfExport auto={auto} />
            
            {canEdit && (
              <Button variant="outline" asChild>
                <Link to={`/autos-medicao/${id}/editar`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>
            )}

            {canSubmit && (
              <Button onClick={handleSubmit}>
                <Send className="mr-2 h-4 w-4" />
                Submeter
              </Button>
            )}

            {auto.estado === 'submetido' && (
              <Button onClick={handleValidate}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Validar
              </Button>
            )}

            {auto.estado === 'validado' && (
              <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="mr-2 h-4 w-4" />
                Aprovar
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Período</p>
                  <p className="font-medium">
                    {formatDate(auto.data_inicio)} - {formatDate(auto.data_fim)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Responsável</p>
                  <p className="font-medium">{auto.responsavel_medicao}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Medido</p>
                  <p className="font-medium text-lg">{formatCurrency(auto.valor_medido_atual || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progresso</p>
                  <p className="font-medium text-lg">{(auto.percentagem_global || 0).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="itens" className="space-y-4">
          <TabsList>
            <TabsTrigger value="itens">Itens Medidos</TabsTrigger>
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="financeiro">Resumo Financeiro</TabsTrigger>
          </TabsList>

          <TabsContent value="itens">
            <Card>
              <CardContent className="pt-6">
                <AutoMedicaoItemsTable
                  items={auto.itens || []}
                  autoId={auto.id}
                  readOnly={!canEdit}
                  onAddItem={(item) => id && addItem({ autoId: id, item })}
                  onUpdateItem={(itemId, data) => updateItem({ id: itemId, data })}
                  onDeleteItem={(itemId) => id && deleteItem({ id: itemId, autoId: id })}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detalhes">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Identificação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Obra</p>
                    <p className="font-medium">{auto.obra?.nome}</p>
                  </div>
                  {auto.localizacao_obra && (
                    <div>
                      <p className="text-sm text-muted-foreground">Localização</p>
                      <p className="font-medium">{auto.localizacao_obra}</p>
                    </div>
                  )}
                  {auto.contrato_referencia && (
                    <div>
                      <p className="text-sm text-muted-foreground">Ref. Contrato</p>
                      <p className="font-medium">{auto.contrato_referencia}</p>
                    </div>
                  )}
                  {auto.fase_obra && (
                    <div>
                      <p className="text-sm text-muted-foreground">Fase da Obra</p>
                      <p className="font-medium">{auto.fase_obra}</p>
                    </div>
                  )}
                  {auto.zona_medicao && (
                    <div>
                      <p className="text-sm text-muted-foreground">Zona de Medição</p>
                      <p className="font-medium">{auto.zona_medicao}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Responsabilidade Técnica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Responsável pela Medição</p>
                    <p className="font-medium">{auto.responsavel_medicao}</p>
                  </div>
                  {auto.responsavel_cargo && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cargo</p>
                      <p className="font-medium">{auto.responsavel_cargo}</p>
                    </div>
                  )}
                  {auto.responsavel_ordem && (
                    <div>
                      <p className="text-sm text-muted-foreground">Ordem Profissional</p>
                      <p className="font-medium">{auto.responsavel_ordem}</p>
                    </div>
                  )}
                  {auto.fiscal_obra && (
                    <div>
                      <p className="text-sm text-muted-foreground">Fiscal de Obra</p>
                      <p className="font-medium">{auto.fiscal_obra}</p>
                    </div>
                  )}
                  {auto.fiscal_entidade && (
                    <div>
                      <p className="text-sm text-muted-foreground">Entidade Fiscalizadora</p>
                      <p className="font-medium">{auto.fiscal_entidade}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {(auto.condicoes_execucao || auto.observacoes_tecnicas || auto.nao_conformidades) && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Observações Técnicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {auto.condicoes_execucao && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Condições de Execução</p>
                        <p className="mt-1">{auto.condicoes_execucao}</p>
                      </div>
                    )}
                    {auto.observacoes_tecnicas && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Observações</p>
                        <p className="mt-1">{auto.observacoes_tecnicas}</p>
                      </div>
                    )}
                    {auto.nao_conformidades && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-4 w-4" />
                          <p className="text-sm font-medium">Não Conformidades</p>
                        </div>
                        <p className="mt-1 text-red-600">{auto.nao_conformidades}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="financeiro">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Valor Previsto</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(auto.valor_previsto || 0)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Medido Anterior</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(auto.valor_anterior_acumulado || 0)}</p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Medido Atual</p>
                    <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(auto.valor_medido_atual || 0)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Medido Acumulado</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(auto.valor_medido_acumulado || 0)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">IVA ({auto.taxa_iva || 23}%)</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(auto.valor_iva || 0)}</p>
                  </div>
                  <div className="p-4 bg-green-100 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total c/ IVA</p>
                    <p className="text-2xl font-bold mt-1 text-green-700">{formatCurrency(auto.valor_total_com_iva || 0)}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">Progresso Global</span>
                    <span className="font-bold">{(auto.percentagem_global || 0).toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(auto.percentagem_global || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
