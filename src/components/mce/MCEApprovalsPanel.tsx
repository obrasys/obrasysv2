import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useMCEApprovals,
  useRequestMCEApproval,
  useDecideMCEApproval,
} from '@/hooks/useMCEApprovals';
import {
  MCE_APPROVAL_LEVEL_LABELS,
  MCE_APPROVAL_DECISION_LABELS,
  type MceApproval,
  type MceApprovalDecision,
  type MceStatus,
} from '@/types/mce';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  mceId: string;
  mceStatus: MceStatus;
}

function DecisionBadge({ d }: { d: MceApproval['decision'] }) {
  const map: Record<MceApprovalDecision, { label: string; cls: string; icon: JSX.Element }> = {
    pendente: {
      label: MCE_APPROVAL_DECISION_LABELS.pendente,
      cls: 'bg-muted text-muted-foreground',
      icon: <Clock className="h-3 w-3" />,
    },
    aprovado: {
      label: MCE_APPROVAL_DECISION_LABELS.aprovado,
      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    rejeitado: {
      label: MCE_APPROVAL_DECISION_LABELS.rejeitado,
      cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      icon: <XCircle className="h-3 w-3" />,
    },
    devolvido: {
      label: MCE_APPROVAL_DECISION_LABELS.devolvido,
      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      icon: <RotateCcw className="h-3 w-3" />,
    },
  };
  const c = map[d];
  return (
    <Badge variant="outline" className={cn('gap-1 border-0', c.cls)}>
      {c.icon}
      {c.label}
    </Badge>
  );
}

function DecideDialog({
  approval,
  mceId,
  disabled,
}: {
  approval: MceApproval;
  mceId: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<MceApprovalDecision>('aprovado');
  const [comment, setComment] = useState('');
  const [validated, setValidated] = useState<string>('');
  const [signature, setSignature] = useState('');
  const decide = useDecideMCEApproval();

  const submit = async () => {
    await decide.mutateAsync({
      approval_id: approval.id,
      mce_id: mceId,
      decision,
      comment: comment.trim() || undefined,
      validated_amount: validated ? Number(validated) : undefined,
      signature: signature.trim() || undefined,
    });
    setOpen(false);
    setComment('');
    setValidated('');
    setSignature('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" disabled={disabled}>
          <ShieldCheck className="h-4 w-4 mr-1" />
          Decidir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Decisão — {MCE_APPROVAL_LEVEL_LABELS[approval.level]}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['aprovado', 'devolvido', 'rejeitado'] as MceApprovalDecision[]).map((d) => (
              <Button
                key={d}
                type="button"
                variant={decision === d ? 'default' : 'outline'}
                onClick={() => setDecision(d)}
                size="sm"
              >
                {MCE_APPROVAL_DECISION_LABELS[d]}
              </Button>
            ))}
          </div>
          <div>
            <Label>Comentário</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Notas, justificações..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor validado (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={validated}
                onChange={(e) => setValidated(e.target.value)}
              />
            </div>
            <div>
              <Label>Assinatura</Label>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Nome / iniciais"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={decide.isPending}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MCEApprovalsPanel({ mceId, mceStatus }: Props) {
  const { user } = useAuth();
  const { data: approvals = [], isLoading } = useMCEApprovals(mceId);
  const request = useRequestMCEApproval();

  const sorted = [...approvals].sort((a, b) => a.level_order - b.level_order);
  const allApproved = sorted.length > 0 && sorted.every((a) => a.decision === 'aprovado');
  const canRequest = !['em_aprovacao', 'aprovado', 'adjudicado'].includes(mceStatus);

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Workflow de Aprovações</h3>
        </div>
        <Button
          size="sm"
          onClick={() => request.mutate(mceId)}
          disabled={!canRequest || request.isPending}
        >
          <Send className="h-4 w-4 mr-1" />
          {mceStatus === 'em_aprovacao' ? 'Reenviar' : 'Submeter para aprovação'}
        </Button>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground">A carregar...</div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="text-sm text-muted-foreground">Sem níveis configurados.</div>
      )}

      <div className="space-y-2">
        {sorted.map((a, idx) => {
          const previousOk = sorted
            .slice(0, idx)
            .every((p) => p.decision === 'aprovado' || !p.required);
          const canDecide =
            mceStatus === 'em_aprovacao' &&
            previousOk &&
            a.decision === 'pendente' &&
            !!user;
          return (
            <div
              key={a.id}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3 transition-colors',
                a.decision === 'aprovado' && 'bg-emerald-50/40 dark:bg-emerald-900/10',
                a.decision === 'rejeitado' && 'bg-red-50/40 dark:bg-red-900/10',
                a.decision === 'devolvido' && 'bg-amber-50/40 dark:bg-amber-900/10',
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {a.level_order}
                </div>
                <div className="min-w-0">
                  <div className="font-medium">
                    {MCE_APPROVAL_LEVEL_LABELS[a.level]}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {a.decided_by_name
                      ? `${a.decided_by_name} • ${
                          a.decided_at
                            ? new Date(a.decided_at).toLocaleDateString('pt-PT')
                            : ''
                        }`
                      : 'Aguarda decisão'}
                    {a.comment ? ` — ${a.comment}` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <DecisionBadge d={a.decision} />
                <DecideDialog approval={a} mceId={mceId} disabled={!canDecide} />
              </div>
            </div>
          );
        })}
      </div>

      {allApproved && (
        <div className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Todos os níveis aprovaram. MCE está pronto para adjudicação.
        </div>
      )}
    </div>
  );
}
