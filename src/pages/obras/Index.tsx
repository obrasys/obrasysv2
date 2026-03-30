import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Archive, Search, Filter, Building2, Play, CheckCircle, TrendingUp, Eye, Pencil, MoreHorizontal, ChevronLeft, ChevronRight, ArchiveIcon, Trash2, Lock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ObraStatusBadge } from '@/components/obras/ObraStatusBadge';
import { useObras } from '@/hooks/useObras';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { UpgradePromptModal } from '@/components/subscription/UpgradePromptModal';
import { OBRA_STATUS_OPTIONS } from '@/types/obras';
import type { ObraStatus } from '@/types/obras';

const PAGE_SIZE = 8;

const KPI_CONFIG = [
  { icon: Building2, bgClass: 'bg-primary/10', iconClass: 'text-primary' },
  { icon: Play, bgClass: 'bg-green-500/10', iconClass: 'text-green-600' },
  { icon: CheckCircle, bgClass: 'bg-purple-500/10', iconClass: 'text-purple-600' },
  { icon: TrendingUp, bgClass: 'bg-amber-500/10', iconClass: 'text-amber-600' },
];

function KpiCard({ index, label, value, suffix }: { index: number; label: string; value: number; suffix?: string }) {
  const { icon: Icon, bgClass, iconClass } = KPI_CONFIG[index];
  return (
    <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${bgClass}`}>
        <Icon className={`w-5 h-5 ${iconClass}`} />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}{suffix}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function ObrasPage() {
  const navigate = useNavigate();
  const { obras, obrasArquivadas, isLoading, archiveObra, deleteObra } = useObras();
  const { canCreateObra, limits, tier } = useFeatureGate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [archivedPage, setArchivedPage] = useState(0);

  const filteredObras = useMemo(() =>
    (obras || []).filter((obra) => {
      const matchesSearch = obra.nome.toLowerCase().includes(search.toLowerCase()) ||
        obra.cliente?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || obra.status === statusFilter;
      return matchesSearch && matchesStatus;
    }),
  [obras, search, statusFilter]);

  const totalPages = Math.ceil(filteredObras.length / PAGE_SIZE);
  const pageData = filteredObras.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const archivedTotal = Math.ceil((obrasArquivadas?.length || 0) / PAGE_SIZE);
  const archivedPageData = (obrasArquivadas || []).slice(archivedPage * PAGE_SIZE, (archivedPage + 1) * PAGE_SIZE);

  const totalObras = obras?.length || 0;
  const obrasEmCurso = obras?.filter(o => o.status === 'em_curso').length || 0;
  const obrasConcluidas = obras?.filter(o => o.status === 'concluida').length || 0;
  const progressoMedio = totalObras > 0
    ? Math.round((obras?.reduce((sum, o) => sum + (o.progresso || 0), 0) || 0) / totalObras)
    : 0;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(parseISO(d), 'dd/MM/yyyy', { locale: pt }); } catch { return '—'; }
  };

  const handleDelete = () => {
    if (deleteConfirm) { deleteObra.mutate(deleteConfirm); setDeleteConfirm(null); }
  };

  const Pagination = ({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) =>
    total > 1 ? (
      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-muted-foreground">Página {current + 1} de {total}</p>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(Math.max(0, current - 1))} disabled={current === 0}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(Math.min(total - 1, current + 1))} disabled={current >= total - 1}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    ) : null;

  return (
    <AppLayout
      title="Gestão de Obras"
      subtitle="Gerencie todas as suas obras e projetos"
      actions={
        <Button onClick={() => {
          if (canCreateObra) {
            navigate('/obras/criar');
          } else {
            setShowUpgradeModal(true);
          }
        }}>
          {!canCreateObra && <Lock className="w-4 h-4 mr-2" />}
          <Plus className="w-4 h-4 mr-2" />
          Nova Obra
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-5">
        {/* KPIs */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <KpiCard index={0} label="Total de Obras" value={totalObras} />
          <KpiCard index={1} label="Em Curso" value={obrasEmCurso} />
          <KpiCard index={2} label="Concluídas" value={obrasConcluidas} />
          <KpiCard index={3} label="Progresso Médio" value={progressoMedio} suffix="%" />
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Ativas ({filteredObras.length})</TabsTrigger>
            <TabsTrigger value="archived">
              <Archive className="w-4 h-4 mr-2" />
              Arquivadas ({obrasArquivadas?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Pesquisar obras..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {OBRA_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : pageData.length > 0 ? (
              <div className="bg-card border rounded-xl">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Cliente</TableHead>
                        <TableHead className="text-xs">Progresso</TableHead>
                        <TableHead className="text-xs">Data Início</TableHead>
                        <TableHead className="text-xs text-right">Valor</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                        <TableHead className="text-xs w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageData.map((obra) => (
                        <TableRow key={obra.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/obras/${obra.id}`)}>
                          <TableCell className="font-medium text-sm max-w-[200px] truncate">{obra.nome}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">{obra.cliente || '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <Progress value={obra.progresso || 0} className="h-1.5 flex-1" />
                              <span className="text-xs font-medium w-8 text-right">{Math.round(obra.progresso || 0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(obra.data_inicio)}</TableCell>
                          <TableCell className="text-sm font-medium text-right whitespace-nowrap">{obra.valor_previsto ? formatCurrency(obra.valor_previsto) : '—'}</TableCell>
                          <TableCell><ObraStatusBadge status={obra.status as ObraStatus} size="sm" /></TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/obras/${obra.id}`); }}>
                                  <Eye className="w-3.5 h-3.5 mr-2" /> Ver
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/obras/${obra.id}/editar`); }}>
                                  <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); archiveObra.mutate({ id: obra.id, arquivada: true }); }}>
                                  <ArchiveIcon className="w-3.5 h-3.5 mr-2" /> Arquivar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(obra.id); }}>
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="px-4 pb-3">
                  <Pagination current={page} total={totalPages} onChange={setPage} />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-xl">
                <p className="text-muted-foreground">Nenhuma obra encontrada.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/obras/criar')}>
                  <Plus className="w-4 h-4 mr-2" /> Criar primeira obra
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived" className="space-y-4">
            {archivedPageData.length > 0 ? (
              <div className="bg-card border rounded-xl">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Cliente</TableHead>
                        <TableHead className="text-xs w-[180px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedPageData.map((obra) => (
                        <TableRow key={obra.id} className="opacity-75">
                          <TableCell className="font-medium text-sm">{obra.nome}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{obra.cliente || '—'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => archiveObra.mutate({ id: obra.id, arquivada: false })}>Restaurar</Button>
                              <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteConfirm(obra.id)}>Eliminar</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="px-4 pb-3">
                  <Pagination current={archivedPage} total={archivedTotal} onChange={setArchivedPage} />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-xl">
                <p className="text-muted-foreground">Nenhuma obra arquivada.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Obra</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível. A obra e todos os dados associados serão eliminados permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpgradePromptModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Limite de obras atingido"
        description={`O plano ${tier === 'starter' ? 'Starter' : 'atual'} permite até ${limits.maxObrasAtivas} obra(s) ativa(s). Faça upgrade para o plano Professional para obras ilimitadas.`}
        requiredPlan="Professional"
      />
    </AppLayout>
  );
}
