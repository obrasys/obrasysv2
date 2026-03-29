import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Plus, 
  Loader2, 
  Building2,
  FileText,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  Package,
  MoreHorizontal,
  Search,
  Link as LinkIcon,
  Bell,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ContaCard, ContaForm, FinanceiroDashboard, ReceivableAlertsCard } from '@/components/financeiro';
import { ObraLaborCostsTab } from '@/components/obras/ObraLaborCostsTab';
import { ObraCustosExtrasTab } from '@/components/obras/ObraCustosExtrasTab';
import { useObra } from '@/hooks/useObras';
import { useObraLaborSummary } from '@/hooks/useObraLaborCosts';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useReceivableAlerts } from '@/hooks/useReceivableAlerts';
import { useClientes } from '@/hooks/useClientes';
import { useCategorias } from '@/hooks/useCategorias';
import type { ContaFinanceira, ContaFinanceiraFormData } from '@/types/financeiro';

export default function ObraFinanceiroPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterOrigem, setFilterOrigem] = useState<string>('all');
  const [filterPago, setFilterPago] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaFinanceira | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadConta, setUploadConta] = useState<ContaFinanceira | null>(null);

  const { obra, isLoading: loadingObra } = useObra(id);
  const { data: laborSummary } = useObraLaborSummary(id);
  const { totalDueSoon, totalOverdue } = useReceivableAlerts(id);
  const { 
    contas, 
    fornecedores, 
    dashboard, 
    isLoading, 
    loadingDashboard,
    createConta, 
    updateConta, 
    marcarPago, 
    deleteConta,
    uploadComprovante,
  } = useFinanceiro(id);

  const { clientes } = useClientes();
  const { categorias } = useCategorias();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const handleSubmit = (data: ContaFinanceiraFormData) => {
    // Garantir que a obra_id está sempre preenchida
    const contaData = { ...data, obra_id: id };
    if (editingConta) {
      updateConta.mutate({ id: editingConta.id, data: contaData });
    } else {
      createConta.mutate(contaData);
    }
    setEditingConta(null);
  };

  const handleEdit = (conta: ContaFinanceira) => {
    setEditingConta(conta);
    setFormOpen(true);
  };

  const handleDelete = (contaId: string) => {
    setDeleteId(contaId);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteConta.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleTogglePago = (contaId: string, pago: boolean) => {
    marcarPago.mutate({ id: contaId, pago });
  };

  const handleUploadComprovante = async (conta: ContaFinanceira) => {
    const { generateComprovantePdf } = await import('@/lib/comprovante-pdf');
    const blob = generateComprovantePdf(conta);
    const file = new File([blob], `comprovante-${conta.id}.pdf`, { type: 'application/pdf' });
    uploadComprovante.mutate({ contaId: conta.id, file });
  };

  // Calcular valor do orçamento como receita
  const valorOrcamentos = obra?.orcamentos?.reduce((sum, orc) => sum + (orc.valor_total || 0), 0) || 0;
  const orcamentosAprovados = obra?.orcamentos?.filter(o => o.status === 'adjudicado') || [];
  const valorOrcamentoAprovado = orcamentosAprovados.reduce((sum, orc) => sum + (orc.valor_total || 0), 0);

  // Filtrar contas
  const filteredContas = contas?.filter((conta) => {
    const matchesSearch = conta.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      conta.fornecedor?.nome?.toLowerCase().includes(search.toLowerCase());
    
    const matchesTipo = filterTipo === 'all' || conta.tipo === filterTipo;
    const matchesOrigem = filterOrigem === 'all' || conta.origem === filterOrigem;
    const matchesPago = filterPago === 'all' || 
      (filterPago === 'pago' && conta.pago) || 
      (filterPago === 'pendente' && !conta.pago);

    return matchesSearch && matchesTipo && matchesOrigem && matchesPago;
  });

  const contasPagar = filteredContas?.filter(c => c.tipo === 'pagar') || [];
  const contasReceber = filteredContas?.filter(c => c.tipo === 'receber') || [];
  const contasRH = filteredContas?.filter(c => c.origem === 'mao_de_obra') || [];
  const contasMaterial = filteredContas?.filter(c => c.origem === 'material') || [];
  const contasAVencer = filteredContas?.filter(c => {
    if (c.pago || c.tipo !== 'receber') return false;
    const due = new Date(c.data_vencimento);
    const today = new Date();
    const in5 = new Date();
    in5.setDate(in5.getDate() + 5);
    return due >= today && due <= in5;
  }) || [];

  if (loadingObra || isLoading) {
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

  return (
    <AppLayout
      title={`Financeiro - ${obra.nome}`}
      subtitle="Gestão financeira da obra"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/obras/${id}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button variant="outline" onClick={() => navigate('/financeiro')}>
            <Wallet className="w-4 h-4 mr-2" />
            Financeiro Global
          </Button>
          <Button onClick={() => { setEditingConta(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Orçamento como Receita */}
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <FileText className="w-5 h-5" />
              Orçamento Vinculado
            </CardTitle>
            <CardDescription>
              Valor do orçamento adjudicado como receita prevista
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orcamentosAprovados.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(valorOrcamentoAprovado)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Receita prevista (orçamento adjudicado)
                    </p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-green-300" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {orcamentosAprovados.map((orc) => (
                    <Badge 
                      key={orc.id} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-green-100"
                      onClick={() => navigate(`/orcamentos/${orc.id}/editar`)}
                    >
                      <LinkIcon className="w-3 h-3 mr-1" />
                      {orc.titulo} - {formatCurrency(orc.valor_total || 0)}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            ) : valorOrcamentos > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-muted-foreground">
                      {formatCurrency(valorOrcamentos)}
                    </p>
                    <p className="text-sm text-yellow-600">
                      Orçamento pendente de adjudicação
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {obra.orcamentos?.map((orc) => (
                    <Badge 
                      key={orc.id} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => navigate(`/orcamentos/${orc.id}/editar`)}
                    >
                      {orc.titulo} ({orc.status})
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  Nenhum orçamento vinculado a esta obra
                </p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => navigate('/orcamentos/criar')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Orçamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dashboard Financeiro */}
        <FinanceiroDashboard data={dashboard} isLoading={loadingDashboard} />

        {/* Alertas de Vencimento */}
        <ReceivableAlertsCard obraId={id} />

        {/* Saldo da Obra */}
        {valorOrcamentoAprovado > 0 && dashboard && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Balanço da Obra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Receita (Orçamento)</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(valorOrcamentoAprovado)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Despesas</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(dashboard.totalPagar)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Mão de Obra</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(laborSummary?.totalCost || 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Lucro Previsto</p>
                  <p className={`text-2xl font-bold ${(valorOrcamentoAprovado - dashboard.totalPagar - (laborSummary?.totalCost || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(valorOrcamentoAprovado - dashboard.totalPagar - (laborSummary?.totalCost || 0))}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>Margem de lucro</span>
                  <span>{Math.round(((valorOrcamentoAprovado - dashboard.totalPagar - (laborSummary?.totalCost || 0)) / valorOrcamentoAprovado) * 100)}%</span>
                </div>
                <Progress 
                  value={Math.min(100, Math.max(0, ((valorOrcamentoAprovado - dashboard.totalPagar - (laborSummary?.totalCost || 0)) / valorOrcamentoAprovado) * 100))} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pagar">A Pagar</SelectItem>
              <SelectItem value="receber">A Receber</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterOrigem} onValueChange={setFilterOrigem}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="mao_de_obra">Mão de Obra</SelectItem>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="outros">Outros</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPago} onValueChange={setFilterPago}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs por Categoria */}
        <Tabs defaultValue="todas" className="w-full">
          <TabsList className="flex-wrap">
            <TabsTrigger value="todas">
              Todas ({filteredContas?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="rh" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              RH ({contasRH.length})
            </TabsTrigger>
            <TabsTrigger value="material" className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              Material ({contasMaterial.length})
            </TabsTrigger>
            <TabsTrigger value="pagar" className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              A Pagar ({contasPagar.length})
            </TabsTrigger>
            <TabsTrigger value="receber" className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              A Receber ({contasReceber.length})
            </TabsTrigger>
            <TabsTrigger value="mao-de-obra" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              Mão de Obra
            </TabsTrigger>
            <TabsTrigger value="custos-extra" className="flex items-center gap-1">
              <MoreHorizontal className="w-3 h-3" />
              Custos Extra
            </TabsTrigger>
            {(totalDueSoon > 0 || totalOverdue > 0 || contasAVencer.length > 0) && (
              <TabsTrigger value="a-vencer" className="flex items-center gap-1">
                <Bell className="w-3 h-3" />
                A Vencer ({totalDueSoon + totalOverdue + contasAVencer.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="todas" className="mt-4">
            <ContasList 
              contas={filteredContas || []}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePago={handleTogglePago}
              onUploadComprovante={handleUploadComprovante}
            />
          </TabsContent>

          <TabsContent value="rh" className="mt-4">
            {laborSummary && laborSummary.totalCost > 0 ? (
              <ObraLaborCostsTab obraId={id!} />
            ) : (
              <ContasList 
                contas={contasRH}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTogglePago={handleTogglePago}
                onUploadComprovante={handleUploadComprovante}
                emptyMessage="Nenhum registo de mão de obra. Lance horas no Livro de Ponto para ver os custos aqui."
              />
            )}
          </TabsContent>

          <TabsContent value="material" className="mt-4">
            <ContasList 
              contas={contasMaterial}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePago={handleTogglePago}
              onUploadComprovante={handleUploadComprovante}
              emptyMessage="Nenhuma conta de Material"
            />
          </TabsContent>

          <TabsContent value="pagar" className="mt-4">
            <ContasList 
              contas={contasPagar}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePago={handleTogglePago}
              onUploadComprovante={handleUploadComprovante}
              emptyMessage="Nenhuma conta a pagar"
            />
          </TabsContent>

          <TabsContent value="receber" className="mt-4">
            <ContasList 
              contas={contasReceber}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePago={handleTogglePago}
              onUploadComprovante={handleUploadComprovante}
              emptyMessage="Nenhuma conta a receber"
            />
          </TabsContent>

          <TabsContent value="mao-de-obra" className="mt-4">
            <ObraLaborCostsTab obraId={id!} />
          </TabsContent>

          <TabsContent value="custos-extra" className="mt-4">
            <ObraCustosExtrasTab obraId={id!} />
          </TabsContent>

          <TabsContent value="a-vencer" className="mt-4">
            <ReceivableAlertsCard obraId={id} />
            {contasAVencer.length > 0 && (
              <div className="mt-4">
                <ContasList
                  contas={contasAVencer}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onTogglePago={handleTogglePago}
                  onUploadComprovante={handleUploadComprovante}
                  emptyMessage="Nenhuma conta a vencer em breve"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Form Modal - obra_id já preenchido */}
        <ContaForm
          open={formOpen}
          onOpenChange={setFormOpen}
          conta={editingConta}
          obras={obra ? [obra] : []}
          fornecedores={fornecedores}
          clientes={clientes?.map(c => ({ id: c.id, nome: c.nome })) || []}
          categorias={categorias}
          onSubmit={handleSubmit}
          isLoading={createConta.isPending || updateConta.isPending}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </AppLayout>
  );
}

// Componente para listar contas
interface ContasListProps {
  contas: ContaFinanceira[];
  onEdit: (conta: ContaFinanceira) => void;
  onDelete: (id: string) => void;
  onTogglePago: (id: string, pago: boolean) => void;
  onUploadComprovante: (conta: ContaFinanceira) => void;
  emptyMessage?: string;
}

function ContasList({ contas, onEdit, onDelete, onTogglePago, onUploadComprovante, emptyMessage = 'Nenhuma conta encontrada' }: ContasListProps) {
  if (contas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contas.map((conta) => (
        <ContaCard
          key={conta.id}
          conta={conta}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePago={onTogglePago}
          onUploadComprovante={onUploadComprovante}
        />
      ))}
    </div>
  );
}
