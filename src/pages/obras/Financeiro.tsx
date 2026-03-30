import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  ArrowLeft, Plus, Loader2, FileText, ExternalLink,
  TrendingUp, TrendingDown, Wallet, Users, Package,
  MoreHorizontal, Search, Link as LinkIcon, Bell,
  CircleDollarSign, AlertTriangle, Clock, ArrowUpRight,
  ArrowDownRight, Percent, BarChart3,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ContaCard, ContaForm, ReceivableAlertsCard } from '@/components/financeiro';
import { ObraLaborCostsTab } from '@/components/obras/ObraLaborCostsTab';
import { ObraCustosExtrasTab } from '@/components/obras/ObraCustosExtrasTab';
import { useObra } from '@/hooks/useObras';
import { useObraLaborSummary } from '@/hooks/useObraLaborCosts';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useReceivableAlerts } from '@/hooks/useReceivableAlerts';
import { useClientes } from '@/hooks/useClientes';
import { useCategorias } from '@/hooks/useCategorias';
import type { ContaFinanceira, ContaFinanceiraFormData } from '@/types/financeiro';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

const formatCurrencyShort = (value: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

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
    contas, fornecedores, dashboard, isLoading, loadingDashboard,
    createConta, updateConta, marcarPago, deleteConta, uploadComprovante,
  } = useFinanceiro(id);

  const { clientes } = useClientes();
  const { categorias } = useCategorias();

  const handleSubmit = (data: ContaFinanceiraFormData) => {
    const contaData = { ...data, obra_id: id };
    if (editingConta) {
      updateConta.mutate({ id: editingConta.id, data: contaData });
    } else {
      createConta.mutate(contaData);
    }
    setEditingConta(null);
  };

  const handleEdit = (conta: ContaFinanceira) => { setEditingConta(conta); setFormOpen(true); };
  const handleDelete = (contaId: string) => { setDeleteId(contaId); };
  const confirmDelete = () => { if (deleteId) { deleteConta.mutate(deleteId); setDeleteId(null); } };
  const handleTogglePago = (contaId: string, pago: boolean) => { marcarPago.mutate({ id: contaId, pago }); };

  const handleUploadComprovante = async (conta: ContaFinanceira) => {
    const { generateComprovantePdf } = await import('@/lib/comprovante-pdf');
    const blob = generateComprovantePdf(conta);
    const file = new File([blob], `comprovante-${conta.id}.pdf`, { type: 'application/pdf' });
    uploadComprovante.mutate({ contaId: conta.id, file });
  };

  const valorOrcamentos = obra?.orcamentos?.reduce((sum, orc) => sum + (orc.valor_total || 0), 0) || 0;
  const orcamentosAprovados = obra?.orcamentos?.filter(o => o.status === 'adjudicado') || [];
  const valorOrcamentoAprovado = orcamentosAprovados.reduce((sum, orc) => sum + (orc.valor_total || 0), 0);

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
          <Button variant="outline" className="mt-4" onClick={() => navigate('/obras')}>Voltar às Obras</Button>
        </div>
      </AppLayout>
    );
  }

  const totalDespesas = (dashboard?.totalPagar || 0) + (laborSummary?.totalCost || 0);
  const lucroPrevisto = valorOrcamentoAprovado - totalDespesas;
  const margemLucro = valorOrcamentoAprovado > 0 ? (lucroPrevisto / valorOrcamentoAprovado) * 100 : 0;
  const percentPago = dashboard && dashboard.totalPagar > 0 ? (dashboard.pagoPagar / dashboard.totalPagar) * 100 : 0;
  const percentRecebido = dashboard && dashboard.totalReceber > 0 ? (dashboard.pagoReceber / dashboard.totalReceber) * 100 : 0;

  return (
    <AppLayout
      title={`Financeiro`}
      subtitle={obra.nome}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/obras/${id}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Obra
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/financeiro')}>
            <Wallet className="w-4 h-4 mr-1" />
            Global
          </Button>
          <Button size="sm" onClick={() => { setEditingConta(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" />
            Nova Conta
          </Button>
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-5">

        {/* ═══ HERO: Balance Overview ═══ */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border border-primary/10 p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Left: Main balance */}
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Balanço da Obra</p>
                {valorOrcamentoAprovado > 0 ? (
                  <>
                    <p className={`text-3xl md:text-4xl font-bold tracking-tight ${lucroPrevisto >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {formatCurrency(lucroPrevisto)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Lucro previsto · Margem de {Math.round(margemLucro)}%
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl md:text-4xl font-bold tracking-tight text-muted-foreground">—</p>
                    <p className="text-sm text-muted-foreground mt-1">Sem orçamento adjudicado</p>
                  </>
                )}
              </div>

              {/* Profit margin bar */}
              {valorOrcamentoAprovado > 0 && (
                <div className="max-w-md">
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                    <span>Despesas {formatCurrencyShort(totalDespesas)}</span>
                    <span>Receita {formatCurrencyShort(valorOrcamentoAprovado)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${margemLucro >= 20 ? 'bg-emerald-500' : margemLucro >= 0 ? 'bg-amber-500' : 'bg-destructive'}`}
                      style={{ width: `${Math.min(100, Math.max(0, 100 - margemLucro))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Linked budgets */}
              {orcamentosAprovados.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {orcamentosAprovados.map((orc) => (
                    <Badge
                      key={orc.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 text-xs"
                      onClick={() => navigate(`/orcamentos/${orc.id}/editar`)}
                    >
                      <LinkIcon className="w-3 h-3 mr-1" />
                      {orc.titulo} · {formatCurrencyShort(orc.valor_total || 0)}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Quick breakdown */}
            <div className="grid grid-cols-2 gap-3 lg:w-[380px] shrink-0">
              <div className="rounded-xl bg-card border p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Receita</span>
                </div>
                <p className="text-lg font-bold text-emerald-600">{formatCurrencyShort(valorOrcamentoAprovado || valorOrcamentos)}</p>
                {valorOrcamentoAprovado > 0 && (
                  <div className="mt-1.5">
                    <Progress value={percentRecebido} className="h-1" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">{Math.round(percentRecebido)}% recebido</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-card border p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Despesas</span>
                </div>
                <p className="text-lg font-bold text-destructive">{formatCurrencyShort(dashboard?.totalPagar || 0)}</p>
                {dashboard && dashboard.totalPagar > 0 && (
                  <div className="mt-1.5">
                    <Progress value={percentPago} className="h-1" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">{Math.round(percentPago)}% pago</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-card border p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Mão de Obra</span>
                </div>
                <p className="text-lg font-bold">{formatCurrencyShort(laborSummary?.totalCost || 0)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {laborSummary?.totalHours?.toFixed(0) || 0}h · {laborSummary?.totalWorkers || 0} trab.
                </p>
              </div>

              <div className={`rounded-xl border p-3.5 ${(dashboard?.vencidas || 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-card'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${(dashboard?.vencidas || 0) > 0 ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                    {(dashboard?.vencidas || 0) > 0
                      ? <AlertTriangle className="w-4 h-4 text-red-500" />
                      : <Clock className="w-4 h-4 text-amber-500" />
                    }
                  </div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    {(dashboard?.vencidas || 0) > 0 ? 'Vencidas' : 'A Vencer'}
                  </span>
                </div>
                {(dashboard?.vencidas || 0) > 0 ? (
                  <>
                    <p className="text-lg font-bold text-red-600">{dashboard!.vencidas}</p>
                    <p className="text-[10px] text-red-600 mt-0.5">{formatCurrencyShort(dashboard!.valorVencido)} em atraso</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-amber-600">{dashboard?.aVencer7Dias || 0}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatCurrencyShort(dashboard?.valorAVencer || 0)} próx. 7 dias</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ DESPESAS POR ORIGEM ═══ */}
        {dashboard && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Mão de Obra', value: dashboard.contasPorOrigem.mao_de_obra, icon: Users, color: 'text-blue-600', bg: 'bg-blue-500/10' },
              { label: 'Material', value: dashboard.contasPorOrigem.material, icon: Package, color: 'text-purple-600', bg: 'bg-purple-500/10' },
              { label: 'Outros', value: dashboard.contasPorOrigem.outros, icon: MoreHorizontal, color: 'text-muted-foreground', bg: 'bg-muted' },
            ].map((item) => (
              <Card key={item.label} className="border-dashed">
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold">{formatCurrencyShort(item.value)}</p>
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ═══ ALERTAS ═══ */}
        <ReceivableAlertsCard obraId={id} />

        {/* ═══ FILTROS + TABS ═══ */}
        <Card>
          <CardContent className="pt-5 pb-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Pesquisar contas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pagar">A Pagar</SelectItem>
                  <SelectItem value="receber">A Receber</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterOrigem} onValueChange={setFilterOrigem}>
                <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Origem" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="mao_de_obra">Mão de Obra</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPago} onValueChange={setFilterPago}>
                <SelectTrigger className="w-[110px] h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ═══ TABS ═══ */}
        <Tabs defaultValue="todas" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-primary/5 border border-primary/15 p-1 rounded-xl">
            <TabsTrigger value="todas" className="text-xs gap-1 rounded-lg px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
              Todas ({filteredContas?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="receber" className="text-xs gap-1 rounded-lg px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
              <TrendingUp className="w-3 h-3" />A Receber ({contasReceber.length})
            </TabsTrigger>
            <TabsTrigger value="pagar" className="text-xs gap-1 rounded-lg px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
              <TrendingDown className="w-3 h-3" />A Pagar ({contasPagar.length})
            </TabsTrigger>
            <TabsTrigger value="mao-de-obra" className="text-xs gap-1 rounded-lg px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
              <Users className="w-3 h-3" />Mão de Obra
            </TabsTrigger>
            <TabsTrigger value="custos-extra" className="text-xs gap-1 rounded-lg px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
              <MoreHorizontal className="w-3 h-3" />Custos Extra
            </TabsTrigger>
            {(totalDueSoon > 0 || totalOverdue > 0 || contasAVencer.length > 0) && (
              <TabsTrigger value="a-vencer" className="text-xs gap-1 rounded-lg px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                <Bell className="w-3 h-3" />A Vencer ({totalDueSoon + totalOverdue + contasAVencer.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="todas" className="mt-4">
            <ContasList contas={filteredContas || []} onEdit={handleEdit} onDelete={handleDelete} onTogglePago={handleTogglePago} onUploadComprovante={handleUploadComprovante} />
          </TabsContent>
          <TabsContent value="receber" className="mt-4">
            <ContasList contas={contasReceber} onEdit={handleEdit} onDelete={handleDelete} onTogglePago={handleTogglePago} onUploadComprovante={handleUploadComprovante} emptyMessage="Nenhuma conta a receber" />
          </TabsContent>
          <TabsContent value="pagar" className="mt-4">
            <ContasList contas={contasPagar} onEdit={handleEdit} onDelete={handleDelete} onTogglePago={handleTogglePago} onUploadComprovante={handleUploadComprovante} emptyMessage="Nenhuma conta a pagar" />
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
                <ContasList contas={contasAVencer} onEdit={handleEdit} onDelete={handleDelete} onTogglePago={handleTogglePago} onUploadComprovante={handleUploadComprovante} />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Form Modal */}
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
              <AlertDialogDescription>Tem a certeza que deseja eliminar esta conta? Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}

// ── ContasList ──
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
        <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {contas.map((conta) => (
        <ContaCard key={conta.id} conta={conta} onEdit={onEdit} onDelete={onDelete} onTogglePago={onTogglePago} onUploadComprovante={onUploadComprovante} />
      ))}
    </div>
  );
}
