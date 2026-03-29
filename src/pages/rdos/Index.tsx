import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { RDOCard } from '@/components/rdos';
import { KpiCard } from '@/components/relatorios/KpiCard';
import { useRDOs } from '@/hooks/useRDOs';
import { useObras } from '@/hooks/useObras';
import type { RelatorioDiario } from '@/types/rdos';
import { 
  Plus, 
  Search, 
  FileText, 
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  HardHat,
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function RDOsPage() {
  const navigate = useNavigate();
  const { rdos, isLoading, deleteRDO, submitRDO, approveRDO } = useRDOs();
  const { obras } = useObras();
  
  const [search, setSearch] = useState('');
  const [filterObra, setFilterObra] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [rdoToDelete, setRdoToDelete] = useState<RelatorioDiario | null>(null);

  // Stats
  const totalRDOs = rdos?.length || 0;
  const rdosHoje = rdos?.filter(r => isToday(parseISO(r.data))).length || 0;
  const rdosPendentes = rdos?.filter(r => r.status === 'submetido').length || 0;
  const rdosAprovados = rdos?.filter(r => r.status === 'aprovado').length || 0;

  const filteredRDOs = rdos?.filter((rdo) => {
    const matchesSearch = 
      rdo.trabalhos_executados?.toLowerCase().includes(search.toLowerCase()) ||
      rdo.obra?.nome?.toLowerCase().includes(search.toLowerCase());
    
    const matchesObra = filterObra === 'all' || rdo.obra_id === filterObra;
    const matchesStatus = filterStatus === 'all' || rdo.status === filterStatus;

    return matchesSearch && matchesObra && matchesStatus;
  });

  // Group RDOs by date
  const groupedRDOs = filteredRDOs?.reduce((groups, rdo) => {
    const date = rdo.data;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(rdo);
    return groups;
  }, {} as Record<string, RelatorioDiario[]>);

  const formatDateGroup = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "EEEE, d 'de' MMMM", { locale: pt });
  };

  const handleEdit = (rdo: RelatorioDiario) => {
    navigate(`/rdos/${rdo.id}/editar`);
  };

  const handleDelete = (rdo: RelatorioDiario) => {
    setRdoToDelete(rdo);
  };

  const confirmDelete = () => {
    if (rdoToDelete) {
      deleteRDO.mutate(rdoToDelete.id);
      setRdoToDelete(null);
    }
  };

  const handleSubmit = (rdo: RelatorioDiario) => {
    submitRDO.mutate(rdo.id);
  };

  const handleApprove = (rdo: RelatorioDiario) => {
    approveRDO.mutate(rdo.id);
  };

  return (
    <AppLayout 
      title="Relatórios Diários"
      subtitle="Gestão de RDOs das suas obras"
      actions={
        <Button onClick={() => navigate('/rdos/criar')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo RDO
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-5">

        {/* Stats Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Total de RDOs" value={totalRDOs} icon={FileText} iconClassName="bg-primary/10" />
          <KpiCard title="RDOs Hoje" value={rdosHoje} icon={Calendar} iconClassName="bg-blue-500/10" />
          <KpiCard title="Pendentes" value={rdosPendentes} icon={Clock} iconClassName="bg-amber-500/10" />
          <KpiCard title="Aprovados" value={rdosAprovados} icon={CheckCircle} iconClassName="bg-emerald-500/10" />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por trabalhos ou obra..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={filterObra} onValueChange={setFilterObra}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por obra" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todas as obras</SelectItem>
              {obras?.filter(o => !o.arquivada).map((obra) => (
                <SelectItem key={obra.id} value={obra.id}>
                  <div className="flex items-center gap-2">
                    <HardHat className="h-3.5 w-3.5" />
                    {obra.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="submetido">Submetido</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : groupedRDOs && Object.keys(groupedRDOs).length > 0 ? (
          <div className="space-y-5">
            {Object.entries(groupedRDOs)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, rdosGroup]) => (
                <div key={date} className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground capitalize sticky top-0 bg-background py-2">
                    {formatDateGroup(date)}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {rdosGroup.map((rdo) => (
                      <RDOCard
                        key={rdo.id}
                        rdo={rdo}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onSubmit={handleSubmit}
                        onApprove={handleApprove}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum RDO encontrado</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                {search || filterObra !== 'all' || filterStatus !== 'all'
                  ? 'Tente ajustar os filtros de pesquisa'
                  : 'Comece criando o seu primeiro relatório diário'}
              </p>
              {!search && filterObra === 'all' && filterStatus === 'all' && (
                <Button className="mt-4" onClick={() => navigate('/rdos/criar')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar RDO
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!rdoToDelete} onOpenChange={() => setRdoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar RDO?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O relatório diário de{' '}
              {rdoToDelete && format(parseISO(rdoToDelete.data), "d 'de' MMMM", { locale: pt })} 
              {' '}será permanentemente eliminado.
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
    </AppLayout>
  );
}
