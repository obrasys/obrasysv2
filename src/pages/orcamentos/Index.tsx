import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { OrcamentoCard } from '@/components/orcamentos/OrcamentoCard';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { STATUS_CONFIG } from '@/types/orcamentos';
import {
  PageHeader,
  MetricCard,
  MetricCardGrid,
  FilterBar,
  EmptyState,
} from '@/components/patterns';
import {
  Plus, FileText, Loader2, Sparkles, Filter, Euro, Layers, Package,
  Clock, ChevronLeft, ChevronRight, TrendingUp, Building2, Wand2,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const PAGE_SIZE = 8;

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
    : '—';

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  if (isLoading) {
    return (
      <AppLayout title="Orçamentos" subtitle="Gestão comercial e técnica de propostas">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Orçamentos" subtitle="Gestão comercial e técnica de propostas">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        <PageHeader
          eyebrow="Comercial"
          title="Orçamentos"
          subtitle="Crie, acompanhe e adjudique propostas com controlo total da margem e do escopo."
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => navigate('/orcamentos/essencial/novo')}>
                <Sparkles className="mr-2 h-4 w-4" /> Essencial
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/orcamentos/inteligente')}>
                <Wand2 className="mr-2 h-4 w-4" /> Inteligente
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/icf')}>
                <Building2 className="mr-2 h-4 w-4" /> ICF
              </Button>
              <Button size="sm" onClick={() => navigate('/orcamentos/criar')}>
                <Plus className="mr-2 h-4 w-4" /> Novo Orçamento
              </Button>
            </>
          }
        />

        <MetricCardGrid columns={5} className="mb-5">
          <MetricCard label="Total Orçamentado" value={formatCurrency(totalOrçamentado)} icon={Euro} tone="primary" />
          <MetricCard label="Margem Média" value={`${margemMedia}%`} icon={TrendingUp} tone="success" />
          <MetricCard label="Capítulos" value={String(totalCapitulos)} icon={Layers} />
          <MetricCard label="Itens" value={String(totalItens)} icon={Package} />
          <MetricCard label="Última Atualização" value={ultimaAtualizacao} icon={Clock} />
        </MetricCardGrid>

        <FilterBar
          className="mb-5"
          search={{
            value: searchQuery,
            onChange: (v) => { setSearchQuery(v); setPage(0); },
            placeholder: 'Pesquisar por título, obra ou código…',
          }}
        >
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="h-9 w-full sm:w-[200px]">
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
        </FilterBar>

        {pageData.length > 0 ? (
          <div className="space-y-5">
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
                <p className="text-xs text-text-muted">
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
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="Nenhum orçamento encontrado"
            description={searchQuery || statusFilter !== 'all'
              ? 'Tente ajustar os filtros ou pesquisar com outros termos.'
              : 'Comece por criar a sua primeira proposta comercial.'}
            action={!searchQuery && statusFilter === 'all' ? (
              <Button onClick={() => navigate('/orcamentos/criar')}>
                <Plus className="mr-2 h-4 w-4" /> Criar Primeiro Orçamento
              </Button>
            ) : undefined}
          />
        )}
      </div>

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
