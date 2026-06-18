import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Search, ChevronRight, Star } from 'lucide-react';
import type { Obra } from '@/types/obras';

interface DashboardProjetosAtivosProps {
  obras: Obra[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const faseLabels: Record<string, string> = {
  em_curso: 'EM CURSO',
  pausada: 'PAUSADA',
  concluida: 'CONCLUÍDA',
  planeada: 'PLANEADA',
};

const faseColors: Record<string, string> = {
  em_curso: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40',
  pausada: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40',
  concluida: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40',
  planeada: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-800/40',
};

export function DashboardProjetosAtivos({ obras }: DashboardProjetosAtivosProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [faseFilter, setFaseFilter] = useState('Todas as fases');

  const sorted = useMemo(() => {
    return [...(obras || [])]
      .filter(o => o.status === 'em_curso' || o.status === 'pausada')
      .sort((a, b) => {
        const aRisk = a.status === 'pausada' ? 2 : (a.data_fim && new Date(a.data_fim) < new Date() ? 1 : 0);
        const bRisk = b.status === 'pausada' ? 2 : (b.data_fim && new Date(b.data_fim) < new Date() ? 1 : 0);
        return bRisk - aRisk;
      })
      .filter((o) => {
        const q = search.toLowerCase();
        const matchesSearch = !q || o.nome?.toLowerCase().includes(q) || o.cliente?.toLowerCase().includes(q) || o.id?.toLowerCase().includes(q);
        const matchesFase = faseFilter === 'Todas as fases' || faseLabels[o.status] === faseFilter;
        return matchesSearch && matchesFase;
      });
  }, [obras, search, faseFilter]);

  const getPrazo = (obra: Obra) => {
    if (!obra.data_fim) return { label: '—', color: 'text-muted-foreground' };
    const diff = Math.ceil((new Date(obra.data_fim).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: `${Math.abs(diff)} dias atraso`, color: 'text-destructive font-medium' };
    if (diff === 0) return { label: 'Hoje', color: 'text-amber-600 font-medium' };
    if (diff < 30) return { label: `${diff} mai`, color: 'text-foreground' };
    return { label: new Date(obra.data_fim).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }), color: 'text-foreground' };
  };

  const getMargem = (obra: Obra) => {
    if (!obra.valor_previsto || obra.valor_previsto === 0) return { value: 0, color: 'text-muted-foreground' };
    // Simulação de margem baseada em progresso vs valor
    const margem = obra.progresso ? Math.min(35, Math.max(5, (obra.progresso * 0.3))) : 0;
    return { value: margem.toFixed(1).replace('.', ','), color: margem >= 15 ? 'text-emerald-600' : margem >= 10 ? 'text-amber-600' : 'text-destructive' };
  };

  const getConfianca = (obra: Obra) => {
    const base = obra.status === 'pausada' ? 45 : 85;
    const varia = Math.floor((obra.nome?.length || 0) % 15);
    return Math.min(99, Math.max(30, base + varia));
  };

  if (!obras || obras.filter(o => o.status === 'em_curso' || o.status === 'pausada').length === 0) {
    return (
      <Card className="rounded-xl border-border/50 shadow-sm">
        <CardContent className="py-12 text-center">
          <Star className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Sem projetos ativos. Crie um projeto para começar.</p>
          <Button className="mt-4" size="sm" onClick={() => navigate('/obras/criar')}>Criar projeto</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Projetos ativos</h3>
            <p className="text-[11px] text-muted-foreground">Ordenados por urgência de entrega</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar projeto, cliente ou id..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs w-56"
              />
            </div>
            <select
              value={faseFilter}
              onChange={(e) => setFaseFilter(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option>Todas as fases</option>
              <option>EM CURSO</option>
              <option>PAUSADA</option>
              <option>PLANEADA</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left font-semibold text-muted-foreground uppercase tracking-wider px-5 py-2.5 w-16">REF</th>
                <th className="text-left font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">PROJETO</th>
                <th className="text-left font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">CLIENTE</th>
                <th className="text-right font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">VALOR BASE</th>
                <th className="text-right font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">MARGEM</th>
                <th className="text-left font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">FASE</th>
                <th className="text-left font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">CONFIANÇA</th>
                <th className="text-left font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">ENTREGA</th>
                <th className="w-10 px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 6).map((obra) => {
                const prazo = getPrazo(obra);
                const margem = getMargem(obra);
                const confianca = getConfianca(obra);
                const ref = `TH-${String(obra.id).slice(0, 6).toUpperCase()}`;

                return (
                  <tr
                    key={obra.id}
                    className="border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/obras/${obra.id}`)}
                  >
                    <td className="px-5 py-3 text-muted-foreground font-mono whitespace-nowrap">{ref}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground text-[13px] leading-snug max-w-[200px]">{obra.nome}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{obra.endereco || 'Sem localização'}</div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{obra.cliente || '—'}</td>
                    <td className="px-3 py-3 text-right font-medium whitespace-nowrap">{obra.valor_previsto ? formatCurrency(obra.valor_previsto) : '—'}</td>
                    <td className={`px-3 py-3 text-right font-medium whitespace-nowrap ${margem.color}`}>{margem.value ? `${margem.value}%` : '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${faseColors[obra.status] || faseColors.em_curso}`}>
                        {faseLabels[obra.status] || 'EM CURSO'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${confianca}%` }} />
                        </div>
                        <span className="text-[11px] font-semibold w-8">{confianca}%</span>
                      </div>
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${prazo.color}`}>{prazo.label}</td>
                    <td className="px-3 py-3">
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sorted.length > 6 && (
          <div className="px-5 py-3 border-t border-border/50 flex justify-center">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/obras')}>
              Ver todos os projetos <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
