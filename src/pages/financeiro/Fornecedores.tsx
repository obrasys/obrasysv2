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
import { Plus, Search, Loader2, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFornecedores } from '@/hooks/useFinanceiro';
import { FornecedorCard } from '@/components/financeiro/FornecedorCard';
import { FornecedorForm } from '@/components/financeiro/FornecedorForm';
import type { Fornecedor, FornecedorFormData } from '@/types/financeiro';

const FornecedoresPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterAtivo, setFilterAtivo] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  // Filtrar fornecedores
  const filteredFornecedores = fornecedores?.filter((fornecedor) => {
    const matchesSearch = 
      fornecedor.nome.toLowerCase().includes(search.toLowerCase()) ||
      fornecedor.email?.toLowerCase().includes(search.toLowerCase()) ||
      fornecedor.nif?.toLowerCase().includes(search.toLowerCase());
    
    const matchesAtivo = filterAtivo === 'all' || 
      (filterAtivo === 'ativo' && fornecedor.ativo) || 
      (filterAtivo === 'inativo' && !fornecedor.ativo);

    return matchesSearch && matchesAtivo;
  });

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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Gestão de Fornecedores</h1>
              <p className="text-muted-foreground">
                {fornecedores?.length || 0} fornecedores cadastrados
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, email ou NIF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

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

          <Button onClick={() => { setEditingFornecedor(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Fornecedor
          </Button>
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
      </div>
    </AppLayout>
  );
};

export default FornecedoresPage;
