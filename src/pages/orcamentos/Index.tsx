import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { OrcamentoCard } from '@/components/orcamentos/OrcamentoCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { STATUS_CONFIG } from '@/types/orcamentos';
import {
  Plus, Search, FileText, Loader2, Sparkles, Filter, Euro, Layers, Package,
  Clock, ChevronLeft, ChevronRight, TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const PAGE_SIZE = 8;

const KPI_CONFIG = [
  { icon: Euro, bg: 'bg-primary/10', ic: 'text-primary' },
  { icon: TrendingUp, bg: 'bg-emerald-500/10', ic: 'text-emerald-600' },
  { icon: Layers, bg: 'bg-amber-500/10', ic: 'text-amber-600' },
  { icon: Package, bg: 'bg-purple-500/10', ic: 'text-purple-600' },
  { icon: Clock, bg: 'bg-primary/10', ic: 'text-primary' },
];

export default function OrcamentosPage() {
  const navigate = useNavigate();
  const { orcamentos, isLoading, deleteOrcamento, duplicateOrcamento, createRevisao } = useOrcamentos();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() =>
    (orcamentos || []).filter((orc) => {
      const matchesSearch =
        orc.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        orc.obra?.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        orc.codigo?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || orc.status === statusFilter;
      return matchesSearch && matchesStatus;
    }),
  [orcamentos, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // KPIs
  const all = orcamentos || [];
  const totalOrçamentado = all.reduce((s, o) => {
    const ci = (o.custos_indiretos?.estaleiro || 0) + (o.custos_indiretos?.seguros || 0) + (o.custos_indiretos?.licenciamento || 0);
    const sub = o.valor_total + ci;
    const m = o.margem_lucro / 100;
    return s + (m > 0 && m < 1 ? sub / (1 - m) : sub);
  }, 0);
  const margemMedia = all.length > 0 ? Math.round(all.reduce((s, o) => s + o.margem_lucro, 0) / all.length) : 0;
  const totalCapitulos = all.reduce((s, o) => s + (o.capitulos?.length || 0), 0);
  const totalItens = all.reduce((s, o) => s + (o.capitulos?.reduce((cs, c) => cs + (c.artigos?.length || 0), 0) || 0), 0);
  const ultimaAtualizacao = all.length > 0
    ? format(new Date(Math.max(...all.map(o => new Date(o.updated_at).getTime()))), "dd/MM/yyyy", { locale: pt })
    : '-';

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  const formatCurrencyFull = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

  const getValorFinal = (orc: typeof all[0]) => {
    const ci = (orc.custos_indiretos?.estaleiro || 0) + (orc.custos_indiretos?.seguros || 0) + (orc.custos_indiretos?.licenciamento || 0);
    const sub = orc.valor_total + ci;
    const m = orc.margem_lucro / 100;
    return m > 0 && m < 1 ? sub / (1 - m) : sub;
  };

  if (isLoading) {
    return (
      <AppLayout title="Orçamentos" subtitle="Gerir e criar orçamentos de obra">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Orçamentos"
      subtitle="Gestão comercial e técnica de propostas"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/orcamentos/essencial/novo')}>
            <Sparkles className="mr-2 h-4 w-4" /> Essencial
          </Button>
          <Button onClick={() => navigate('/orcamentos/criar')}>
            <Plus className="mr-2 h-4 w-4" /> Novo Orçamento
          </Button>
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-5">
        {/* KPIs */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Total Orçamentado', value: formatCurrency(totalOrçamentado), idx: 0 },
            { label: 'Margem Média', value: `${margemMedia}%`, idx: 1 },
            { label: 'Capítulos', value: String(totalCapitulos), idx: 2 },
            { label: 'Itens', value: String(totalItens), idx: 3 },
            { label: 'Última Atualização', value: ultimaAtualizacao, idx: 4 },
          ].map((kpi) => {
            const cfg = KPI_CONFIG[kpi.idx];
            return (
              <Card key={kpi.idx} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                    <cfg.icon className={`w-5 h-5 ${cfg.ic}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none">{kpi.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por título, obra ou código..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="all">Todos os estados</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <SelectItem key={value} value={value}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cards Grid */}
        {pageData.length > 0 ? (
          <>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {pageData.map((orc) => (
                <OrcamentoCard
                  key={orc.id}
                  orcamento={orc}
                  onView={(id) => navigate(`/orcamentos/${id}`)}
                  onEdit={(id) => navigate(`/orcamentos/${id}/editar`)}
                  onDuplicate={(id) => duplicateOrcamento.mutateAsync(id)}
                  onRevision={(id) => createRevisao.mutateAsync(id).then(r => navigate(`/orcamentos/${r.id}/editar`))}
                  onDelete={(id) => setDeleteId(id)}
                  onGeneratePDF={() => {}}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {filtered.length} orçamento{filtered.length !== 1 ? 's' : ''} • Página {page + 1} de {totalPages}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-muted/30 rounded-xl">
            <FileText className="h-14 w-14 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum orçamento encontrado</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery || statusFilter !== 'all' ? 'Tente ajustar os filtros' : 'Crie o seu primeiro orçamento'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => navigate('/orcamentos/criar')}>
                <Plus className="mr-2 h-4 w-4" /> Criar Primeiro Orçamento
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
            <AlertDialogDescription>Tem a certeza? Esta ação não pode ser revertida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteOrcamento.mutateAsync(deleteId); setDeleteId(null); } }}
              className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
