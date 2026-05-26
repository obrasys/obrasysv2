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
import { Plus, Search, Loader2, Users, ArrowLeft, Upload, Download, Truck, UserCircle, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFornecedores } from '@/hooks/useFinanceiro';
import { FornecedorCard } from '@/components/financeiro/FornecedorCard';
import { FornecedorForm } from '@/components/financeiro/FornecedorForm';
import { ImportFornecedoresModal } from '@/components/financeiro/ImportFornecedoresModal';
import { AREAS_ATUACAO_FORNECEDOR, type Fornecedor, type FornecedorFormData } from '@/types/financeiro';

const FornecedoresPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterAtivo, setFilterAtivo] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

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
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">Gestão de Fornecedores</h1>
              <p className="text-muted-foreground">
                {fornecedores?.length || 0} fornecedores cadastrados
              </p>
            </div>
          </div>
        </div>

        {/* Separador visual: Fornecedores ≠ Clientes */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Fornecedores (esta página)</p>
              <p className="text-xs text-muted-foreground">
                Contactos de quem te <strong>fornece</strong> materiais ou serviços (carpinteiros, eletricistas, etc.).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/clientes')}
            className="rounded-xl border bg-card p-4 flex items-start gap-3 hover:border-primary/40 hover:bg-accent transition text-left"
          >
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <UserCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Clientes (página separada)</p>
              <p className="text-xs text-muted-foreground">
                Quem te <strong>contrata</strong> obras e orçamentos. Clica para ir para a lista de clientes →
              </p>
            </div>
          </button>
        </div>

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

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportCSV}
              disabled={!fornecedores || fornecedores.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => { setEditingFornecedor(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Fornecedor
            </Button>
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
      </div>
    </AppLayout>
  );
};

export default FornecedoresPage;
