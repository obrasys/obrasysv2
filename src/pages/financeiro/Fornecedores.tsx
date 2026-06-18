import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Search, Loader2, Users, ArrowLeft, Upload, Download, Truck, UserCircle, Briefcase, Mail, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFornecedores } from '@/hooks/useFinanceiro';
import { FornecedorCard } from '@/components/financeiro/FornecedorCard';
import { FornecedorForm } from '@/components/financeiro/FornecedorForm';
import { ImportFornecedoresModal } from '@/components/financeiro/ImportFornecedoresModal';
import { InviteSupplierModal } from '@/components/fornecedor/InviteSupplierModal';
import { TenantInvitesDialog } from '@/components/fornecedor/TenantInvitesDialog';
import { ImportPricebookModal } from '@/components/fornecedor/ImportPricebookModal';
import { DirectQuoteRequestModal } from '@/components/fornecedor/DirectQuoteRequestModal';
import { useTenantSupplierInvites } from '@/hooks/useTenantSupplierInvites';
import { AREAS_ATUACAO_FORNECEDOR, type Fornecedor, type FornecedorFormData } from '@/types/financeiro';
import { PageHeader, MetricCard, MetricCardGrid, EmptyState } from '@/components/patterns';

const FornecedoresPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterAtivo, setFilterAtivo] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitesListOpen, setInvitesListOpen] = useState(false);
  const [pricebookFornecedor, setPricebookFornecedor] = useState<Fornecedor | null>(null);
  const [quoteFornecedor, setQuoteFornecedor] = useState<Fornecedor | null>(null);
  const { data: invites } = useTenantSupplierInvites();
  const pendingInvites = invites?.filter((i) => i.status === 'pending').length || 0;

  const { 
    fornecedores, 
    isLoading, 
    createFornecedor, 
    updateFornecedor, 
    deleteFornecedor,
  } = useFornecedores();

  const handleSubmit = (data: FornecedorFormData & { ativo?: boolean }) => {
    if (editingFornecedor) {
      updateFornecedor.mutate({ id: editingFornecedor.id, data });
    } else {
      createFornecedor.mutate(data);
    }
    setEditingFornecedor(null);
  };

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteFornecedor.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleExportCSV = () => {
    if (!fornecedores || fornecedores.length === 0) return;
    
    const headers = ['nome', 'email', 'telefone', 'endereco', 'nif', 'ativo'];
    const rows = fornecedores.map((f) => [
      f.nome,
      f.email || '',
      f.telefone || '',
      f.endereco || '',
      f.nif || '',
      f.ativo ? 'Sim' : 'Não',
    ]);
    
    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.map(cell => `"${cell}"`).join(';')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fornecedores_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Filtrar fornecedores
  const filteredFornecedores = fornecedores?.filter((fornecedor) => {
    const matchesSearch = 
      fornecedor.nome.toLowerCase().includes(search.toLowerCase()) ||
      fornecedor.email?.toLowerCase().includes(search.toLowerCase()) ||
      fornecedor.nif?.toLowerCase().includes(search.toLowerCase()) ||
      fornecedor.area_atuacao?.toLowerCase().includes(search.toLowerCase());
    
    const matchesAtivo = filterAtivo === 'all' || 
      (filterAtivo === 'ativo' && fornecedor.ativo) || 
      (filterAtivo === 'inativo' && !fornecedor.ativo);

    const matchesArea =
      filterArea === 'all' ||
      (filterArea === '__none__' && !fornecedor.area_atuacao) ||
      fornecedor.area_atuacao === filterArea;

    return matchesSearch && matchesAtivo && matchesArea;
  });

  // Contagem por área (apenas fornecedores ativos visíveis)
  const areaCounts = (fornecedores || []).reduce<Record<string, number>>((acc, f) => {
    const key = f.area_atuacao || '__none__';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <AppLayout title="Fornecedores">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Fornecedores">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        <Button variant="ghost" size="sm" onClick={() => navigate('/financeiro')} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Financeiro
        </Button>

        <PageHeader
          eyebrow="Comercial"
          title="Gestão de Fornecedores"
          subtitle="Contactos de quem fornece materiais ou serviços (carpinteiros, eletricistas, etc.). Distinto dos clientes."
          actions={
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setInvitesListOpen(true)} className="relative gap-2">
                <Mail className="w-4 h-4" /> Convites
                {pendingInvites > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-accent text-accent-foreground">
                    {pendingInvites}
                  </span>
                )}
              </Button>
              <Button variant="outline" onClick={() => setInviteOpen(true)} className="gap-2">
                <Send className="w-4 h-4" /> Convidar
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
                <Upload className="w-4 h-4" /> Importar
              </Button>
              <Button variant="outline" onClick={handleExportCSV} disabled={!fornecedores || fornecedores.length === 0} className="gap-2">
                <Download className="w-4 h-4" /> Exportar
              </Button>
              <Button onClick={() => { setEditingFornecedor(null); setFormOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" /> Novo Fornecedor
              </Button>
            </div>
          }
        />

        <MetricCardGrid columns={4}>
          <MetricCard label="Total" value={fornecedores?.length || 0} icon={Truck} tone="primary" />
          <MetricCard label="Ativos" value={fornecedores?.filter(f => f.ativo).length || 0} icon={UserCircle} tone="success" />
          <MetricCard label="Áreas distintas" value={Object.keys(areaCounts).filter(k => k !== '__none__').length} icon={Briefcase} tone="default" />
          <MetricCard label="Convites pendentes" value={pendingInvites} icon={Mail} tone="warning" />
        </MetricCardGrid>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, email, NIF ou área..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterArea} onValueChange={setFilterArea}>
              <SelectTrigger className="w-[220px]">
                <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Área de atuação" />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                <SelectItem value="all">Todas as áreas</SelectItem>
                {AREAS_ATUACAO_FORNECEDOR.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}{areaCounts[area] ? ` (${areaCounts[area]})` : ''}
                  </SelectItem>
                ))}
                <SelectItem value="__none__">Sem área definida{areaCounts['__none__'] ? ` (${areaCounts['__none__']})` : ''}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterAtivo} onValueChange={setFilterAtivo}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fornecedores List */}
        {filteredFornecedores?.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Nenhum fornecedor encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'Tente ajustar os filtros de pesquisa' : 'Comece adicionando o primeiro fornecedor'}
            </p>
            {!search && (
              <Button onClick={() => { setEditingFornecedor(null); setFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Fornecedor
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFornecedores?.map((fornecedor) => (
              <FornecedorCard
                key={fornecedor.id}
                fornecedor={fornecedor}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onImportPricebook={setPricebookFornecedor}
                onRequestQuote={setQuoteFornecedor}
              />
            ))}
          </div>
        )}

        {/* Form Modal */}
        <FornecedorForm
          open={formOpen}
          onOpenChange={setFormOpen}
          fornecedor={editingFornecedor}
          onSubmit={handleSubmit}
          isLoading={createFornecedor.isPending || updateFornecedor.isPending}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.
                Contas financeiras associadas a este fornecedor perderão a referência.
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

        {/* Import Modal */}
        <ImportFornecedoresModal
          open={importOpen}
          onOpenChange={setImportOpen}
        />

        {/* Invite Modal */}
        <InviteSupplierModal open={inviteOpen} onOpenChange={setInviteOpen} />

        {/* Invites List Dialog */}
        <TenantInvitesDialog open={invitesListOpen} onOpenChange={setInvitesListOpen} />

        {/* Pricebook Import Modal */}
        <ImportPricebookModal
          open={!!pricebookFornecedor}
          onOpenChange={(v) => !v && setPricebookFornecedor(null)}
          fornecedor={pricebookFornecedor}
        />

        {/* Direct Quote Request Modal */}
        <DirectQuoteRequestModal
          open={!!quoteFornecedor}
          onOpenChange={(v) => !v && setQuoteFornecedor(null)}
          fornecedor={quoteFornecedor}
        />
      </div>
    </AppLayout>
  );
};

export default FornecedoresPage;
