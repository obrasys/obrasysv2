import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { FileText, Download, Send, Check, X, Trash2, Plus, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCommercialProposals, type CommercialProposalStatus } from '@/hooks/useCommercialProposals';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  orcamento: any;
  valorBase: number;
  valorIVA: number;
  valorFinal: number;
  taxaIVA: number;
}

const STATUS_META: Record<CommercialProposalStatus, { label: string; cls: string }> = {
  draft:    { label: 'Rascunho', cls: 'bg-muted text-muted-foreground' },
  sent:     { label: 'Enviada',  cls: 'bg-sky-100 text-sky-900 border-sky-300' },
  accepted: { label: 'Aceite',   cls: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  rejected: { label: 'Recusada', cls: 'bg-red-100 text-red-900 border-red-300' },
  expired:  { label: 'Expirada', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
};

export function CommercialProposalsPanel({ orcamento, valorBase, valorIVA, valorFinal, taxaIVA }: Props) {
  const { profile } = useAuth();
  const { proposals, isLoading, create, updateStatus, remove, download } = useCommercialProposals(orcamento?.id);
  const [open, setOpen] = useState(false);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreate = async () => {
    await create.mutateAsync({
      orcamento,
      profile,
      valorBase,
      valorIVA,
      valorFinal,
      taxaIVA,
      validUntil: validUntil || null,
      notes: notes || null,
    });
    setOpen(false);
    setValidUntil('');
    setNotes('');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Propostas comerciais
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Versões da proposta enviada ao cliente. Cada versão guarda um snapshot do orçamento.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nova versão
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar…</p>
        ) : proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não foi gerada nenhuma proposta comercial para este orçamento.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border">
            {proposals.map((p) => {
              const meta = STATUS_META[p.status];
              return (
                <li key={p.id} className="flex items-center gap-3 p-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    v{p.version}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Criada {format(new Date(p.created_at), "d MMM yyyy 'às' HH:mm", { locale: pt })}
                      </span>
                      {p.valid_until && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Válida até {format(new Date(p.valid_until), 'd MMM yyyy', { locale: pt })}
                        </span>
                      )}
                    </div>
                    {p.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{p.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => download(p).catch(() => {})}>
                      <Download className="h-3.5 w-3.5 mr-1" /> PDF
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">Estado</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background">
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: p.id, status: 'sent' })}>
                          <Send className="h-3.5 w-3.5 mr-2" /> Marcar como enviada
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: p.id, status: 'accepted' })}>
                          <Check className="h-3.5 w-3.5 mr-2" /> Marcar como aceite
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: p.id, status: 'rejected' })}>
                          <X className="h-3.5 w-3.5 mr-2" /> Marcar como recusada
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: p.id, status: 'expired' })}>
                          <Calendar className="h-3.5 w-3.5 mr-2" /> Marcar como expirada
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Remover proposta v${p.version}?`)) remove.mutate(p);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova proposta comercial</DialogTitle>
            <DialogDescription>
              Gera o PDF a partir do estado atual do orçamento e guarda como nova versão.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="valid_until">Válida até</Label>
              <Input
                id="valid_until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notas internas (opcional)</Label>
              <Textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: alinhamento com cliente sobre prazos"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={create.isPending}>
              {create.isPending ? 'A gerar…' : 'Gerar proposta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
