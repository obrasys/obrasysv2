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
import { Calendar, Plus, ArrowRight, ArrowDownRight, ArrowUpRight, StickyNote, Pencil, Trash2 } from 'lucide-react';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useAgendaNotes, type AgendaNote } from '@/hooks/useAgendaNotes';
import { cn } from '@/lib/utils';

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

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
  const today = useMemo(() => new Date(), []);
  const horizon = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 14);
    return d;
  }, [today]);

  const startISO = toISODate(today);
  const endISO = toISODate(horizon);

  const { contas } = useFinanceiro();
  const { notes, createNote, updateNote, deleteNote } = useAgendaNotes(startISO, endISO);

  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<AgendaNote | null>(null);
  const [form, setForm] = useState<{ titulo: string; descricao: string; data: string; hora: string }>({
    titulo: '', descricao: '', data: startISO, hora: '',
  });

  const openNew = () => {
    setEditing(null);
    setForm({ titulo: '', descricao: '', data: startISO, hora: '' });
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
    if (editing) {
      await updateNote.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createNote.mutateAsync(payload);
    }
    setOpenDialog(false);
  };

  // Build agenda entries
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

  // Group by date
  const groups = useMemo(() => {
    const map = new Map<string, AgendaEntry[]>();
    entries.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return Array.from(map.entries());
  }, [entries]);

  return (
    <Card className="rounded-xl shadow-sm border-border/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Agenda — Próximos 14 dias
        </CardTitle>
        <div className="flex gap-2">
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="default" onClick={openNew}>
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
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        {groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Sem eventos nos próximos 14 dias.</p>
            <Button variant="link" size="sm" onClick={openNew}>Adicionar uma nota</Button>
          </div>
        )}

        {groups.map(([date, items]) => (
          <div key={date}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{formatDateLabel(date)}</p>
            <div className="space-y-1.5">
              {items.map((e) => (
                <div key={e.key} className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg border border-border/40 bg-muted/20',
                  e.pago && 'opacity-60'
                )}>
                  {e.kind === 'nota' ? (
                    <Checkbox
                      checked={!!e.note?.concluida}
                      onCheckedChange={(v) => e.note && updateNote.mutate({ id: e.note.id, concluida: !!v } as any)}
                    />
                  ) : e.kind === 'recebimento' ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-600 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-medium truncate', e.note?.concluida && 'line-through text-muted-foreground')}>
                        {e.titulo}
                      </span>
                      {e.kind === 'nota' && <Badge variant="secondary" className="text-[10px] py-0 h-4"><StickyNote className="w-2.5 h-2.5 mr-1" />Nota</Badge>}
                      {e.pago && <Badge variant="outline" className="text-[10px] py-0 h-4">Liquidado</Badge>}
                    </div>
                    {(e.descricao || e.hora) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {e.hora ? `${e.hora} · ` : ''}{e.descricao || ''}
                      </p>
                    )}
                  </div>

                  {e.valor != null && (
                    <span className={cn('text-sm font-semibold shrink-0', e.kind === 'recebimento' ? 'text-emerald-600' : 'text-red-600')}>
                      {fmtEUR(e.valor)}
                    </span>
                  )}

                  {e.kind === 'nota' && e.note && (
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(e.note!)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteNote.mutate(e.note!.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-2 pt-1">
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
