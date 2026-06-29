import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar, Plus, ArrowRight, ArrowDownRight, ArrowUpRight, StickyNote,
  Pencil, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useAgendaNotes, type AgendaNote } from '@/hooks/useAgendaNotes';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'week' | 'month';

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfWeek(d: Date) { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); x.setHours(0,0,0,0); return x; } // Monday start
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

function formatDateLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  return d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' });
}

const fmtEUR = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

interface AgendaEntry {
  key: string;
  date: string;
  hora?: string | null;
  kind: 'pagamento' | 'recebimento' | 'nota';
  titulo: string;
  descricao?: string | null;
  valor?: number;
  pago?: boolean;
  note?: AgendaNote;
}

export function DashboardAgenda() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('list');
  const [anchor, setAnchor] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });

  // Range based on view
  const { rangeStart, rangeEnd, periodLabel } = useMemo(() => {
    if (view === 'week') {
      const s = startOfWeek(anchor);
      const e = addDays(s, 6);
      return {
        rangeStart: s, rangeEnd: e,
        periodLabel: `${s.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} – ${e.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      };
    }
    if (view === 'month') {
      const s = startOfMonth(anchor);
      const e = endOfMonth(anchor);
      return {
        rangeStart: s, rangeEnd: e,
        periodLabel: anchor.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }),
      };
    }
    const s = new Date(anchor);
    const e = addDays(anchor, 14);
    return { rangeStart: s, rangeEnd: e, periodLabel: 'Próximos 14 dias' };
  }, [view, anchor]);

  const startISO = toISODate(rangeStart);
  const endISO = toISODate(rangeEnd);

  const { contas } = useFinanceiro();
  const { notes, createNote, updateNote, deleteNote } = useAgendaNotes(startISO, endISO);

  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<AgendaNote | null>(null);
  const [form, setForm] = useState<{ titulo: string; descricao: string; data: string; hora: string }>({
    titulo: '', descricao: '', data: startISO, hora: '',
  });

  const openNew = (dateISO?: string) => {
    setEditing(null);
    setForm({ titulo: '', descricao: '', data: dateISO || toISODate(new Date()), hora: '' });
    setOpenDialog(true);
  };
  const openEdit = (n: AgendaNote) => {
    setEditing(n);
    setForm({ titulo: n.titulo, descricao: n.descricao || '', data: n.data, hora: n.hora || '' });
    setOpenDialog(true);
  };

  const submit = async () => {
    if (!form.titulo.trim()) return;
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      data: form.data,
      hora: form.hora || null,
    };
    if (editing) await updateNote.mutateAsync({ id: editing.id, ...payload });
    else await createNote.mutateAsync(payload);
    setOpenDialog(false);
  };

  // Build entries within range
  const entries = useMemo<AgendaEntry[]>(() => {
    const list: AgendaEntry[] = [];
    (contas || []).forEach((c: any) => {
      if (!c.data_vencimento) return;
      const d = c.data_vencimento;
      if (d < startISO || d > endISO) return;
      list.push({
        key: `c-${c.id}`,
        date: d,
        kind: c.tipo === 'a_receber' ? 'recebimento' : 'pagamento',
        titulo: c.descricao || (c.tipo === 'a_receber' ? 'Recebimento' : 'Pagamento'),
        descricao: c.obra?.nome || c.fornecedor?.nome || c.cliente?.nome || null,
        valor: Number(c.valor || 0),
        pago: !!c.pago,
      });
    });
    (notes || []).forEach((n) => {
      list.push({
        key: `n-${n.id}`,
        date: n.data,
        hora: n.hora,
        kind: 'nota',
        titulo: n.titulo,
        descricao: n.descricao,
        note: n,
      });
    });
    return list.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.hora || '').localeCompare(b.hora || '');
    });
  }, [contas, notes, startISO, endISO]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, AgendaEntry[]>();
    entries.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return map;
  }, [entries]);

  const navigatePeriod = (dir: -1 | 1) => {
    if (view === 'week') setAnchor((d) => addDays(d, 7 * dir));
    else if (view === 'month') setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
    else setAnchor((d) => addDays(d, 14 * dir));
  };
  const goToday = () => { const d = new Date(); d.setHours(0,0,0,0); setAnchor(d); };

  return (
    <Card className="rounded-xl shadow-sm border-border/50">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Agenda
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="list" className="text-xs px-2">Lista</TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-2">Semana</TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-2">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => openNew()}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Nota
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing ? 'Editar nota da agenda' : 'Nova nota na agenda'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="agenda-titulo">Título</Label>
                    <Input id="agenda-titulo" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ex.: Reunião com cliente" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="agenda-data">Data</Label>
                      <Input id="agenda-data" type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="agenda-hora">Hora (opcional)</Label>
                      <Input id="agenda-hora" type="time" value={form.hora} onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="agenda-desc">Descrição (opcional)</Label>
                    <Textarea id="agenda-desc" rows={3} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
                  <Button onClick={submit} disabled={!form.titulo.trim()}>{editing ? 'Guardar' : 'Adicionar'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigatePeriod(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={goToday}>Hoje</Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigatePeriod(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-sm font-medium capitalize text-muted-foreground">{periodLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {view === 'list' && <ListView entries={entries} onEdit={openEdit} onDelete={(id) => deleteNote.mutate(id)} onToggle={(id, v) => updateNote.mutate({ id, concluida: v } as any)} />}
        {view === 'week' && <WeekView start={rangeStart} entriesByDate={entriesByDate} onAdd={openNew} onEdit={openEdit} onDelete={(id) => deleteNote.mutate(id)} onToggle={(id, v) => updateNote.mutate({ id, concluida: v } as any)} />}
        {view === 'month' && <MonthView anchor={anchor} entriesByDate={entriesByDate} onAdd={openNew} />}

        <div className="grid grid-cols-2 gap-2 pt-3 mt-2 border-t border-border/40">
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/financeiro')}>
            Ver financeiro <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/tarefas')}>
            Ver tarefas <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------- Subviews ------- */

function EntryRow({ e, onEdit, onDelete, onToggle, compact }: {
  e: AgendaEntry;
  onEdit: (n: AgendaNote) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/40 bg-muted/20',
      e.pago && 'opacity-60'
    )}>
      {e.kind === 'nota' ? (
        <Checkbox
          checked={!!e.note?.concluida}
          onCheckedChange={(v) => e.note && onToggle(e.note.id, !!v)}
        />
      ) : e.kind === 'recebimento' ? (
        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      ) : (
        <ArrowDownRight className="w-3.5 h-3.5 text-red-600 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-xs font-medium truncate', e.note?.concluida && 'line-through text-muted-foreground')}>
            {e.titulo}
          </span>
          {!compact && e.kind === 'nota' && <Badge variant="secondary" className="text-[10px] py-0 h-4"><StickyNote className="w-2.5 h-2.5 mr-1" />Nota</Badge>}
          {!compact && e.pago && <Badge variant="outline" className="text-[10px] py-0 h-4">Liquidado</Badge>}
        </div>
        {!compact && (e.descricao || e.hora) && (
          <p className="text-[11px] text-muted-foreground truncate">
            {e.hora ? `${e.hora} · ` : ''}{e.descricao || ''}
          </p>
        )}
      </div>
      {e.valor != null && (
        <span className={cn('text-xs font-semibold shrink-0', e.kind === 'recebimento' ? 'text-emerald-600' : 'text-red-600')}>
          {fmtEUR(e.valor)}
        </span>
      )}
      {e.kind === 'nota' && e.note && !compact && (
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEdit(e.note!)}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => onDelete(e.note!.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ListView({ entries, onEdit, onDelete, onToggle }: {
  entries: AgendaEntry[];
  onEdit: (n: AgendaNote) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, v: boolean) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, AgendaEntry[]>();
    entries.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return Array.from(map.entries());
  }, [entries]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Calendar className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Sem eventos neste período.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {groups.map(([date, items]) => (
        <div key={date}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{formatDateLabel(date)}</p>
          <div className="space-y-1.5">
            {items.map((e) => <EntryRow key={e.key} e={e} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function WeekView({ start, entriesByDate, onAdd, onEdit, onDelete, onToggle }: {
  start: Date;
  entriesByDate: Map<string, AgendaEntry[]>;
  onAdd: (date: string) => void;
  onEdit: (n: AgendaNote) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, v: boolean) => void;
}) {
  const todayISO = toISODate(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {days.map((d) => {
        const iso = toISODate(d);
        const items = entriesByDate.get(iso) || [];
        const isToday = iso === todayISO;
        return (
          <div key={iso} className={cn('rounded-lg border border-border/40 p-2 min-h-[140px] flex flex-col', isToday && 'border-primary/50 bg-primary/5')}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs">
                <p className="font-semibold capitalize">{d.toLocaleDateString('pt-PT', { weekday: 'short' })}</p>
                <p className="text-muted-foreground">{d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onAdd(iso)}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-1 flex-1">
              {items.length === 0 && <p className="text-[11px] text-muted-foreground/60 italic">Sem eventos</p>}
              {items.map((e) => <EntryRow key={e.key} e={e} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} compact />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ anchor, entriesByDate, onAdd }: {
  anchor: Date;
  entriesByDate: Map<string, AgendaEntry[]>;
  onAdd: (date: string) => void;
}) {
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const todayISO = toISODate(new Date());
  const currentMonth = anchor.getMonth();
  const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map((w) => (
          <div key={w} className="text-[11px] font-medium text-muted-foreground text-center py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const iso = toISODate(d);
          const items = entriesByDate.get(iso) || [];
          const isOther = d.getMonth() !== currentMonth;
          const isToday = iso === todayISO;
          const recCount = items.filter((e) => e.kind === 'recebimento').length;
          const payCount = items.filter((e) => e.kind === 'pagamento').length;
          const noteCount = items.filter((e) => e.kind === 'nota').length;
          return (
            <button
              key={iso}
              onClick={() => onAdd(iso)}
              className={cn(
                'group relative text-left rounded-md border border-border/40 p-1.5 min-h-[78px] hover:border-primary/50 transition-colors',
                isOther && 'bg-muted/10 opacity-60',
                isToday && 'border-primary/60 bg-primary/5'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn('text-xs font-medium', isToday && 'text-primary font-bold')}>{d.getDate()}</span>
                <Plus className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 2).map((e) => (
                  <div key={e.key} className={cn(
                    'text-[10px] px-1 py-0.5 rounded truncate',
                    e.kind === 'recebimento' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                    e.kind === 'pagamento' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                    e.kind === 'nota' && 'bg-primary/10 text-primary',
                  )}>
                    {e.titulo}
                  </div>
                ))}
                {items.length > 2 && (
                  <div className="text-[10px] text-muted-foreground">+{items.length - 2} mais</div>
                )}
              </div>
              {items.length > 0 && (
                <div className="absolute bottom-1 right-1 flex gap-0.5">
                  {recCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  {payCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                  {noteCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
