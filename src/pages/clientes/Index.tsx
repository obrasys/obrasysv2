import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ClienteCard, ImportCSVModal } from '@/components/clientes';
import { useClientes } from '@/hooks/useClientes';
import { PageHeader, MetricCard, MetricCardGrid, EmptyState } from '@/components/patterns';
import type { Cliente, NivelAcesso } from '@/types/clientes';
import {
  Plus,
  Search,
  Users,
  UserCheck,
  UserX,
  Loader2,
  Upload,
} from 'lucide-react';

export default function ClientesPage() {
  const navigate = useNavigate();
  const { clientes, stats, isLoading, deleteCliente, toggleAtivo } = useClientes();
  
  const [search, setSearch] = useState('');
  const [filterNivel, setFilterNivel] = useState<string>('all');
  const [filterAtivo, setFilterAtivo] = useState<string>('all');
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const filteredClientes = clientes?.filter((cliente) => {
    const matchesSearch = 
      cliente.nome.toLowerCase().includes(search.toLowerCase()) ||
      cliente.email?.toLowerCase().includes(search.toLowerCase()) ||
      cliente.empresa?.toLowerCase().includes(search.toLowerCase());
    
    const matchesNivel = filterNivel === 'all' || cliente.nivel_acesso === filterNivel;
    const matchesAtivo = filterAtivo === 'all' || 
      (filterAtivo === 'ativo' && cliente.ativo) ||
      (filterAtivo === 'inativo' && !cliente.ativo);

    return matchesSearch && matchesNivel && matchesAtivo;
  });

  const handleEdit = (cliente: Cliente) => {
    navigate(`/clientes/${cliente.id}/editar`);
  };

  const handleDelete = (cliente: Cliente) => {
    setClienteToDelete(cliente);
  };

  const confirmDelete = () => {
    if (clienteToDelete) {
      deleteCliente.mutate(clienteToDelete.id);
      setClienteToDelete(null);
    }
  };

  const handleToggleAtivo = (cliente: Cliente) => {
    toggleAtivo.mutate({ id: cliente.id, ativo: !cliente.ativo });
  };

  return (
    <AppLayout
      title="Clientes"
      subtitle="Gerir clientes e suas associações a obras e orçamentos"
    >
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        <PageHeader
          eyebrow="Comercial"
          title="Clientes"
          subtitle="Gere a sua carteira de clientes, contactos e níveis de acesso ao portal."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowImportModal(true)} className="gap-2">
                <Upload className="h-4 w-4" /> Importar CSV
              </Button>
              <Button onClick={() => navigate('/clientes/criar')} className="gap-2">
                <Plus className="h-4 w-4" /> Novo Cliente
              </Button>
            </div>
          }
        />

        <MetricCardGrid columns={3}>
          <MetricCard label="Total de Clientes" value={stats?.total || 0} icon={Users} tone="primary" />
          <MetricCard label="Clientes Ativos" value={stats?.ativos || 0} icon={UserCheck} tone="success" />
          <MetricCard label="Clientes Inativos" value={stats?.inativos || 0} icon={UserX} tone="default" />
        </MetricCardGrid>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={filterNivel} onValueChange={setFilterNivel}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Nível de acesso" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos os níveis</SelectItem>
              <SelectItem value="basico">Básico</SelectItem>
              <SelectItem value="intermediario">Intermédio</SelectItem>
              <SelectItem value="completo">Completo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAtivo} onValueChange={setFilterAtivo}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredClientes && filteredClientes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClientes.map((cliente) => (
              <ClienteCard
                key={cliente.id}
                cliente={cliente}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleAtivo={handleToggleAtivo}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum cliente encontrado</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                {search || filterNivel !== 'all' || filterAtivo !== 'all'
                  ? 'Tente ajustar os filtros de pesquisa'
                  : 'Comece adicionando o seu primeiro cliente'}
              </p>
              {!search && filterNivel === 'all' && filterAtivo === 'all' && (
                <Button className="mt-4" onClick={() => navigate('/clientes/criar')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Cliente
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!clienteToDelete} onOpenChange={() => setClienteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O cliente "{clienteToDelete?.nome}" será
              permanentemente eliminado, mas as obras e orçamentos associados serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import CSV Modal */}
      <ImportCSVModal 
        open={showImportModal} 
        onOpenChange={setShowImportModal}
      />
    </AppLayout>
  );
}
