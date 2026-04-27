import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Search, Loader2, Users, Tags } from 'lucide-react';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { VoiceCommandButton } from '@/components/axia/VoiceCommandButton';
import { useObras } from '@/hooks/useObras';
import { useClientes } from '@/hooks/useClientes';
import { useCategorias } from '@/hooks/useCategorias';
import {
  ContaCard,
  ContaForm,
  FinanceiroGlobalKPIs,
  DespesasOrigemCard,
  FinanceiroObraCards,
  CategoriasManager,
  MargensLucroCard,
} from '@/components/financeiro';
import type { ContaFinanceira, ContaFinanceiraFormData } from '@/types/financeiro';

const FinanceiroIndex = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterPago, setFilterPago] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaFinanceira | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categoriasOpen, setCategoriasOpen] = useState(false);

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
  } = useFinanceiro();

  const { obras } = useObras();
  const { clientes } = useClientes();
  const { categorias } = useCategorias();

  const handleSubmit = (data: ContaFinanceiraFormData) => {
    if (editingConta) {
      updateConta.mutate({ id: editingConta.id, data });
    } else {
      createConta.mutate(data);
    }
    setEditingConta(null);
  };

  const handleEdit = (conta: ContaFinanceira) => {
    setEditingConta(conta);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteConta.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleTogglePago = (id: string, pago: boolean) => {
    marcarPago.mutate({ id, pago });
  };

  const handleUploadComprovante = async (conta: ContaFinanceira) => {
    const { generateComprovantePdf } = await import('@/lib/comprovante-pdf');
    const blob = generateComprovantePdf(conta);
    const file = new File([blob], `comprovante-${conta.id}.pdf`, { type: 'application/pdf' });
    uploadComprovante.mutate({ contaId: conta.id, file });
  };

  const filteredContas = contas?.filter((conta) => {
    const matchesSearch = conta.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      conta.obra?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      conta.fornecedor?.nome?.toLowerCase().includes(search.toLowerCase());
    const matchesTipo = filterTipo === 'all' || conta.tipo === filterTipo;
    const matchesPago = filterPago === 'all' ||
      (filterPago === 'pago' && conta.pago) ||
      (filterPago === 'pendente' && !conta.pago);
    return matchesSearch && matchesTipo && matchesPago;
  });

  const contasPagar = filteredContas?.filter(c => c.tipo === 'pagar') || [];
  const contasReceber = filteredContas?.filter(c => c.tipo === 'receber') || [];

  if (isLoading) {
    return (
      <AppLayout title="Financeiro">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Financeiro"
      actions={<VoiceCommandButton sourceContext="financial" variant="outline" size="default"  />}
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Global KPIs */}
        <FinanceiroGlobalKPIs data={dashboard} isLoading={loadingDashboard} />

        {/* Despesas por Origem */}
        <DespesasOrigemCard contasPorOrigem={dashboard?.contasPorOrigem} />

        {/* Margens de Lucro */}
        <MargensLucroCard />

        {/* Financeiro por Obra */}
        <FinanceiroObraCards />

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-3 flex-wrap">
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
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pagar">A Pagar</SelectItem>
                <SelectItem value="receber">A Receber</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPago} onValueChange={setFilterPago}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCategoriasOpen(true)}>
              <Tags className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Categorias</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/financeiro/fornecedores')}>
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Fornecedores</span>
            </Button>
            <Button onClick={() => { setEditingConta(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </div>
        </div>

        {/* Contas List */}
        <Tabs defaultValue="todas" className="w-full">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="w-max md:w-auto">
              <TabsTrigger value="todas">Todas ({filteredContas?.length || 0})</TabsTrigger>
              <TabsTrigger value="pagar">A Pagar ({contasPagar.length})</TabsTrigger>
              <TabsTrigger value="receber">A Receber ({contasReceber.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="todas" className="mt-4">
            <div className="space-y-3">
              {filteredContas?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhuma conta encontrada</p>
                </div>
              ) : (
                filteredContas?.map((conta) => (
                  <ContaCard
                    key={conta.id}
                    conta={conta}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onTogglePago={handleTogglePago}
                    onUploadComprovante={handleUploadComprovante}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="pagar" className="mt-4">
            <div className="space-y-3">
              {contasPagar.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhuma conta a pagar</p>
                </div>
              ) : (
                contasPagar.map((conta) => (
                  <ContaCard
                    key={conta.id}
                    conta={conta}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onTogglePago={handleTogglePago}
                    onUploadComprovante={handleUploadComprovante}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="receber" className="mt-4">
            <div className="space-y-3">
              {contasReceber.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhuma conta a receber</p>
                </div>
              ) : (
                contasReceber.map((conta) => (
                  <ContaCard
                    key={conta.id}
                    conta={conta}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onTogglePago={handleTogglePago}
                    onUploadComprovante={handleUploadComprovante}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Form Modal */}
        <ContaForm
          open={formOpen}
          onOpenChange={setFormOpen}
          conta={editingConta}
          obras={obras}
          fornecedores={fornecedores}
          clientes={clientes?.map(c => ({ id: c.id, nome: c.nome })) || []}
          categorias={categorias}
          onSubmit={handleSubmit}
          isLoading={createConta.isPending || updateConta.isPending}
        />

        {/* Categorias Manager */}
        <CategoriasManager open={categoriasOpen} onOpenChange={setCategoriasOpen} />

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
};

export default FinanceiroIndex;
