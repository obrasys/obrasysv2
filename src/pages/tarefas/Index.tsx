import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { PageHeader, MetricCard, MetricCardGrid, EmptyState } from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { TarefaCard, TarefaForm, CronogramaTimeline, CronogramaForm, AgendaView } from '@/components/tarefas';
import { useTarefas } from '@/hooks/useTarefas';
import { useObras } from '@/hooks/useObras';
import type { Tarefa, TarefaCronograma, TarefaFormData, CronogramaFormData } from '@/types/tarefas';
import { 
  Plus, 
  Search, 
  CheckSquare, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Calendar,
  ListTodo,
  HardHat,
} from 'lucide-react';

export default function TarefasPage() {
  const { obras } = useObras();
  const { 
    tarefas, 
    cronograma,
    stats, 
    isLoading, 
    createTarefa, 
    updateTarefa, 
    deleteTarefa,
    createCronograma,
    updateCronograma,
    deleteCronograma,
  } = useTarefas();
  
  const [search, setSearch] = useState('');
  const [filterObra, setFilterObra] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPrioridade, setFilterPrioridade] = useState<string>('all');
  
  const [showTarefaForm, setShowTarefaForm] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null);
  const [tarefaToDelete, setTarefaToDelete] = useState<Tarefa | null>(null);
  
  const [showCronogramaForm, setShowCronogramaForm] = useState(false);
  const [editingCronograma, setEditingCronograma] = useState<TarefaCronograma | null>(null);
  const [cronogramaToDelete, setCronogramaToDelete] = useState<TarefaCronograma | null>(null);

  const activeObras = obras?.filter(o => !o.arquivada) || [];

  const filteredTarefas = tarefas?.filter((tarefa) => {
    const matchesSearch = 
      tarefa.titulo.toLowerCase().includes(search.toLowerCase()) ||
      tarefa.descricao?.toLowerCase().includes(search.toLowerCase());
    
    const matchesObra = filterObra === 'all' || tarefa.obra_id === filterObra;
    const matchesStatus = filterStatus === 'all' || tarefa.status === filterStatus;
    const matchesPrioridade = filterPrioridade === 'all' || tarefa.prioridade === filterPrioridade;

    return matchesSearch && matchesObra && matchesStatus && matchesPrioridade;
  });

  const filteredCronograma = cronograma?.filter((item) => {
    const matchesObra = filterObra === 'all' || item.obra_id === filterObra;
    return matchesObra;
  });

  // Tarefa handlers
  const handleCreateTarefa = () => {
    setEditingTarefa(null);
    setShowTarefaForm(true);
  };

  const handleEditTarefa = (tarefa: Tarefa) => {
    setEditingTarefa(tarefa);
    setShowTarefaForm(true);
  };

  const handleSubmitTarefa = (data: TarefaFormData) => {
    if (editingTarefa) {
      updateTarefa.mutate({ id: editingTarefa.id, ...data }, {
        onSuccess: () => setShowTarefaForm(false),
      });
    } else {
      createTarefa.mutate(data, {
        onSuccess: () => setShowTarefaForm(false),
      });
    }
  };

  const handleToggleComplete = (tarefa: Tarefa) => {
    const newStatus = tarefa.status === 'concluida' ? 'pendente' : 'concluida';
    updateTarefa.mutate({ 
      id: tarefa.id, 
      obra_id: tarefa.obra_id,
      titulo: tarefa.titulo,
      status: newStatus,
      prioridade: tarefa.prioridade,
    });
  };

  const confirmDeleteTarefa = () => {
    if (tarefaToDelete) {
      deleteTarefa.mutate(tarefaToDelete.id);
      setTarefaToDelete(null);
    }
  };

  // Cronograma handlers
  const handleCreateCronograma = () => {
    setEditingCronograma(null);
    setShowCronogramaForm(true);
  };

  const handleEditCronograma = (item: TarefaCronograma) => {
    setEditingCronograma(item);
    setShowCronogramaForm(true);
  };

  const handleSubmitCronograma = (data: CronogramaFormData) => {
    if (editingCronograma) {
      updateCronograma.mutate({ id: editingCronograma.id, ...data }, {
        onSuccess: () => setShowCronogramaForm(false),
      });
    } else {
      createCronograma.mutate(data, {
        onSuccess: () => setShowCronogramaForm(false),
      });
    }
  };

  const confirmDeleteCronograma = () => {
    if (cronogramaToDelete) {
      deleteCronograma.mutate(cronogramaToDelete.id);
      setCronogramaToDelete(null);
    }
  };

  return (
    <AppLayout 
      title="Tarefas e Cronograma"
      subtitle="Gestão de tarefas e acompanhamento do cronograma das obras"
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <PageHeader
          eyebrow="Planeamento"
          title="Tarefas e Cronograma"
          subtitle="Organize tarefas, agenda diária e o cronograma físico das obras"
          actions={
            <Button onClick={handleCreateTarefa}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Tarefa
            </Button>
          }
        />

        {/* Stats */}
        <MetricCardGrid columns={5}>
          <MetricCard label="Total" value={stats.total} icon={CheckSquare} />
          <MetricCard label="Pendentes" value={stats.pendentes} icon={Clock} />
          <MetricCard label="Em Progresso" value={stats.emProgresso} icon={ListTodo} tone="primary" />
          <MetricCard label="Atrasadas" value={stats.atrasadas} icon={AlertTriangle} tone="destructive" />
          <MetricCard label="Concluídas" value={stats.concluidas} icon={CheckCircle} tone="success" />
        </MetricCardGrid>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar tarefas..."
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
              {activeObras.map((obra) => (
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
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_progresso">Em Progresso</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="bloqueada">Bloqueada</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tarefas" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="tarefas" className="gap-2">
                <ListTodo className="h-4 w-4" />
                Tarefas
              </TabsTrigger>
              <TabsTrigger value="agenda" className="gap-2">
                <Clock className="h-4 w-4" />
                Agenda
              </TabsTrigger>
              <TabsTrigger value="cronograma" className="gap-2">
                <Calendar className="h-4 w-4" />
                Cronograma
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tarefas" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleCreateTarefa}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Tarefa
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTarefas && filteredTarefas.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTarefas.map((tarefa) => (
                  <TarefaCard
                    key={tarefa.id}
                    tarefa={tarefa}
                    onEdit={handleEditTarefa}
                    onDelete={setTarefaToDelete}
                    onToggleComplete={handleToggleComplete}
                    showObra
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckSquare className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhuma tarefa encontrada</h3>
                  <p className="mt-2 text-sm text-muted-foreground text-center">
                    {search || filterObra !== 'all' || filterStatus !== 'all'
                      ? 'Tente ajustar os filtros de pesquisa'
                      : 'Comece criando a sua primeira tarefa'}
                  </p>
                  {!search && filterObra === 'all' && filterStatus === 'all' && (
                    <Button className="mt-4" onClick={handleCreateTarefa}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Tarefa
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="agenda" className="space-y-4">
            <AgendaView
              tarefas={filteredTarefas || []}
              onEdit={handleEditTarefa}
              onToggleComplete={handleToggleComplete}
            />
          </TabsContent>

          <TabsContent value="cronograma" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleCreateCronograma}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Item
              </Button>
            </div>

            <CronogramaTimeline
              items={filteredCronograma || []}
              onEdit={handleEditCronograma}
              onDelete={setCronogramaToDelete}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Tarefa Form Modal */}
      <TarefaForm
        open={showTarefaForm}
        onOpenChange={setShowTarefaForm}
        tarefa={editingTarefa}
        defaultObraId={filterObra !== 'all' ? filterObra : undefined}
        onSubmit={handleSubmitTarefa}
        isLoading={createTarefa.isPending || updateTarefa.isPending}
      />

      {/* Cronograma Form Modal */}
      <CronogramaForm
        open={showCronogramaForm}
        onOpenChange={setShowCronogramaForm}
        item={editingCronograma}
        defaultObraId={filterObra !== 'all' ? filterObra : undefined}
        onSubmit={handleSubmitCronograma}
        isLoading={createCronograma.isPending || updateCronograma.isPending}
      />

      {/* Delete Tarefa Dialog */}
      <AlertDialog open={!!tarefaToDelete} onOpenChange={() => setTarefaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. A tarefa "{tarefaToDelete?.titulo}" será permanentemente eliminada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTarefa}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Cronograma Dialog */}
      <AlertDialog open={!!cronogramaToDelete} onOpenChange={() => setCronogramaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar item do cronograma?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O item "{cronogramaToDelete?.titulo}" será permanentemente eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCronograma}
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
