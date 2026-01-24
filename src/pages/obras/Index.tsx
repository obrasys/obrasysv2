import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Archive, Search, Filter } from 'lucide-react';
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
import { ObraCard } from '@/components/obras/ObraCard';
import { useObras } from '@/hooks/useObras';
import { OBRA_STATUS_OPTIONS } from '@/types/obras';
import type { ObraStatus } from '@/types/obras';

export default function ObrasPage() {
  const navigate = useNavigate();
  const { obras, obrasArquivadas, isLoading, archiveObra, deleteObra } = useObras();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredObras = obras?.filter((obra) => {
    const matchesSearch = obra.nome.toLowerCase().includes(search.toLowerCase()) ||
      obra.cliente?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || obra.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleArchive = (id: string) => {
    archiveObra.mutate({ id, arquivada: true });
  };

  const handleRestore = (id: string) => {
    archiveObra.mutate({ id, arquivada: false });
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteObra.mutate(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  // KPIs
  const totalObras = obras?.length || 0;
  const obrasEmCurso = obras?.filter(o => o.status === 'em_curso').length || 0;
  const obrasConcluidas = obras?.filter(o => o.status === 'concluida').length || 0;
  const progressoMedio = totalObras > 0
    ? Math.round((obras?.reduce((sum, o) => sum + (o.progresso || 0), 0) || 0) / totalObras)
    : 0;

  return (
    <AppLayout
      title="Gestão de Obras"
      subtitle="Gerencie todas as suas obras e projetos"
      actions={
        <Button onClick={() => navigate('/obras/criar')}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Obra
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* KPIs */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total de Obras</p>
            <p className="text-2xl font-bold">{totalObras}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Em Curso</p>
            <p className="text-2xl font-bold text-green-600">{obrasEmCurso}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Concluídas</p>
            <p className="text-2xl font-bold text-purple-600">{obrasConcluidas}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Progresso Médio</p>
            <p className="text-2xl font-bold">{progressoMedio}%</p>
          </div>
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">
              Obras Ativas ({obras?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="archived">
              <Archive className="w-4 h-4 mr-2" />
              Arquivadas ({obrasArquivadas?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar obras..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {OBRA_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredObras && filteredObras.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredObras.map((obra) => (
                  <ObraCard
                    key={obra.id}
                    obra={obra}
                    onArchive={handleArchive}
                    onDelete={(id) => setDeleteConfirm(id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">Nenhuma obra encontrada.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/obras/criar')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar primeira obra
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived" className="space-y-4">
            {obrasArquivadas && obrasArquivadas.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {obrasArquivadas.map((obra) => (
                  <div key={obra.id} className="bg-card border rounded-lg p-4 opacity-75">
                    <h3 className="font-semibold">{obra.nome}</h3>
                    {obra.cliente && (
                      <p className="text-sm text-muted-foreground">{obra.cliente}</p>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRestore(obra.id)}
                      >
                        Restaurar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteConfirm(obra.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">Nenhuma obra arquivada.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Obra</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. A obra e todos os dados associados serão eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
