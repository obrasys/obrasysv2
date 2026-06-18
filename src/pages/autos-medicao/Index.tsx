import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { PageHeader, EmptyState } from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { AutoMedicaoCard, AutoMedicaoDashboard } from '@/components/autos-medicao';
import { useAutosMedicao } from '@/hooks/useAutosMedicao';
import { useObras } from '@/hooks/useObras';
import { Plus, Search, Filter, LayoutGrid, List, Loader2 } from 'lucide-react';
import { ESTADOS_AUTO } from '@/types/autos-medicao';

export default function AutosMedicaoPage() {
  const navigate = useNavigate();
  const { autos, isLoading, deleteAuto, isDeleting } = useAutosMedicao();
  const { obras } = useObras();
  
  const [search, setSearch] = useState('');
  const [filterObra, setFilterObra] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredAutos = (autos || []).filter(auto => {
    const matchesSearch = !search || 
      auto.obra?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      auto.responsavel_medicao.toLowerCase().includes(search.toLowerCase()) ||
      auto.numero_auto.toString().includes(search);
    
    const matchesObra = filterObra === 'all' || auto.obra_id === filterObra;
    const matchesEstado = filterEstado === 'all' || auto.estado === filterEstado;
    
    return matchesSearch && matchesObra && matchesEstado;
  });

  const handleDelete = () => {
    if (deleteId) {
      deleteAuto(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <AppLayout 
      title="Autos de Medição" 
      subtitle="Gestão de certificados de medição"
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <PageHeader
          eyebrow="Obras"
          title="Autos de Medição"
          subtitle="Gestão de certificados de medição"
          actions={
            <Button asChild>
              <Link to="/autos-medicao/criar">
                <Plus className="mr-2 h-4 w-4" />
                Novo Auto
              </Link>
            </Button>
          }
        />

        {/* Dashboard */}
        {autos && autos.length > 0 && (
          <AutoMedicaoDashboard autos={autos} />
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por obra, responsável ou nº auto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={filterObra} onValueChange={setFilterObra}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filtrar por obra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as obras</SelectItem>
              {obras?.map(obra => (
                <SelectItem key={obra.id} value={obra.id}>
                  {obra.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ESTADOS_AUTO.map(estado => (
                <SelectItem key={estado.value} value={estado.value}>
                  {estado.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1 border rounded-lg p-1">
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
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredAutos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {autos?.length === 0 
                ? 'Nenhum auto de medição criado ainda.'
                : 'Nenhum resultado encontrado para os filtros aplicados.'}
            </p>
            {autos?.length === 0 && (
              <Button className="mt-4" asChild>
                <Link to="/autos-medicao/criar">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Auto
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' 
            : 'space-y-4'
          }>
            {filteredAutos.map(auto => (
              <AutoMedicaoCard 
                key={auto.id} 
                auto={auto} 
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Auto de Medição</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar este auto de medição?
              Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
