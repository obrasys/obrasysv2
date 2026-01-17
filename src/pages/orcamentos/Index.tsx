import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { OrcamentoCard } from '@/components/orcamentos/OrcamentoCard';
import { OrcamentoStatus } from '@/components/orcamentos/OrcamentoStatus';
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
import { STATUS_CONFIG, type OrcamentoStatus as Status } from '@/types/orcamentos';
import {
  Plus,
  Search,
  FileText,
  Loader2,
  ArrowLeft,
  LayoutGrid,
  List,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useEffect } from 'react';

export default function OrcamentosPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    orcamentos,
    isLoading,
    deleteOrcamento,
    duplicateOrcamento,
  } = useOrcamentos();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const filteredOrcamentos = (orcamentos || []).filter((orc) => {
    const matchesSearch =
      orc.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orc.obra?.nome?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || orc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (id: string) => {
    navigate(`/orcamentos/${id}/editar`);
  };

  const handleDuplicate = async (id: string) => {
    await duplicateOrcamento.mutateAsync(id);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteOrcamento.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleGeneratePDF = (id: string) => {
    // TODO: Implement PDF generation
    console.log('Generate PDF for:', id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Orçamentos</h1>
                <p className="text-sm text-muted-foreground">
                  Gerir e criar orçamentos de obra
                </p>
              </div>
            </div>
            <Button onClick={() => navigate('/orcamentos/criar')}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Orçamento
            </Button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar orçamentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos os estados</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {filteredOrcamentos.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrcamentos.map((orcamento) => (
                <OrcamentoCard
                  key={orcamento.id}
                  orcamento={orcamento}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={setDeleteId}
                  onGeneratePDF={handleGeneratePDF}
                />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium">Título</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Obra</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Estado</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">Valor</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">Data</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrcamentos.map((orcamento) => (
                    <tr key={orcamento.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{orcamento.titulo}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {orcamento.obra?.nome || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <OrcamentoStatus status={orcamento.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(orcamento.valor_total)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {format(new Date(orcamento.data_criacao), "d MMM yyyy", { locale: pt })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(orcamento.id)}
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum orçamento encontrado</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Tente ajustar os filtros de pesquisa'
                : 'Crie o seu primeiro orçamento para começar'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => navigate('/orcamentos/criar')}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Orçamento
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Orçamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar este orçamento? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
