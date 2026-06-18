import { useState } from 'react';
import { useAxiaBudgetReview, type AxiaBudgetReviewItem, type ReviewItemType, type ReviewSeverity } from '@/hooks/useAxiaBudgetReview';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileQuestion,
  Ruler,
  Coins,
  FileWarning,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  orcamentoId?: string | null;
  budgetVersionId?: string | null;
  onCanProceedChange?: (canProceed: boolean) => void;
}

const TYPE_META: Record<ReviewItemType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  missing_price: { label: 'Preço em falta', icon: Coins },
  suspect_quantity: { label: 'Quantidade suspeita', icon: Ruler },
  ambiguous_unit: { label: 'Unidade ambígua', icon: HelpCircle },
  doc_mismatch: { label: 'Divergência entre documentos', icon: FileWarning },
  human_question: { label: 'Pergunta ao utilizador', icon: FileQuestion },
  missing_chapter: { label: 'Capítulo em falta', icon: AlertCircle },
  other: { label: 'Outro', icon: Info },
};

const SEVERITY_META: Record<ReviewSeverity, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  critical: { label: 'Crítico', cls: 'border-red-300 bg-red-50 text-red-900', icon: AlertCircle },
  warning: { label: 'Aviso', cls: 'border-amber-300 bg-amber-50 text-amber-900', icon: AlertTriangle },
  info: { label: 'Info', cls: 'border-sky-300 bg-sky-50 text-sky-900', icon: Info },
};

export function RevisaoAssistida({ orcamentoId, budgetVersionId, onCanProceedChange }: Props) {
  const { items, isLoading, pendingCritical, pendingTotal, canProceed, resolveItem } =
    useAxiaBudgetReview({ orcamentoId, budgetVersionId });

  // Notify parent on change (simple effect via ref-less approach)
  if (onCanProceedChange) onCanProceedChange(canProceed);

  if (!orcamentoId && !budgetVersionId) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Nada para rever ainda</AlertTitle>
        <AlertDescription>
          Conclui a estruturação assistida para a Axia gerar a lista de itens a validar.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Alert className="border-emerald-300 bg-emerald-50">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertTitle className="text-emerald-900">Sem itens pendentes</AlertTitle>
        <AlertDescription className="text-emerald-800/80">
          A Axia não detetou dúvidas relevantes. Podes avançar para gravar o rascunho.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <SummaryStat label="Pendentes" value={pendingTotal} tone="default" />
        <SummaryStat label="Críticos pendentes" value={pendingCritical.length} tone={pendingCritical.length > 0 ? 'danger' : 'ok'} />
        <SummaryStat label="Resolvidos" value={items.length - pendingTotal} tone="ok" />
      </div>

      {!canProceed && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Existem itens críticos por resolver</AlertTitle>
          <AlertDescription>
            Tens de aceitar, alterar ou rejeitar todos os itens críticos antes de gravar o orçamento.
          </AlertDescription>
        </Alert>
      )}

      <ul className="space-y-2">
        {items.map((item) => (
          <ReviewItemCard
            key={item.id}
            item={item}
            onResolve={(status) =>
              resolveItem.mutate({ id: item.id, status })
            }
            isPending={resolveItem.isPending}
          />
        ))}
      </ul>
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: 'default' | 'danger' | 'ok' }) {
  return (
    <Card className={cn(
      tone === 'danger' && 'border-red-300 bg-red-50',
      tone === 'ok' && 'border-emerald-300 bg-emerald-50/60',
    )}>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ReviewItemCard({
  item,
  onResolve,
  isPending,
}: {
  item: AxiaBudgetReviewItem;
  onResolve: (status: 'accepted' | 'rejected' | 'dismissed') => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_META[item.severity];
  const type = TYPE_META[item.item_type];
  const SevIcon = sev.icon;
  const TypeIcon = type.icon;

  const resolved = item.status !== 'pending';

  return (
    <li>
      <Card className={cn('border', sev.cls, resolved && 'opacity-70')}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start gap-3">
            <SevIcon className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-background">
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {type.label}
                </Badge>
                <Badge variant="outline" className="bg-background">{sev.label}</Badge>
                {resolved && (
                  <Badge variant="secondary">
                    {item.status === 'accepted' && 'Aceite'}
                    {item.status === 'rejected' && 'Rejeitado'}
                    {item.status === 'modified' && 'Alterado'}
                    {item.status === 'dismissed' && 'Ignorado'}
                  </Badge>
                )}
                {item.source_page != null && (
                  <Badge variant="outline" className="bg-background text-xs">
                    Pág. {item.source_page}{item.source_line ? ` · L${item.source_line}` : ''}
                  </Badge>
                )}
              </div>
              <p className="font-medium mt-1">{item.title}</p>
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}

              {(item.axia_suggestion || item.original_value) && (
                <button
                  type="button"
                  className="text-xs text-primary underline mt-1"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? 'Ocultar detalhes' : 'Ver sugestão da Axia'}
                </button>
              )}

              {expanded && (
                <div className="grid md:grid-cols-2 gap-2 mt-2 text-xs">
                  {item.original_value && (
                    <div className="rounded-lg border bg-background p-2">
                      <p className="font-medium mb-1">Valor original</p>
                      <pre className="whitespace-pre-wrap break-words text-muted-foreground">
                        {safeJson(item.original_value)}
                      </pre>
                    </div>
                  )}
                  {item.axia_suggestion && (
                    <div className="rounded-lg border bg-background p-2">
                      <p className="font-medium mb-1">Sugestão Axia</p>
                      <pre className="whitespace-pre-wrap break-words text-muted-foreground">
                        {safeJson(item.axia_suggestion)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {!resolved && (
            <div className="flex flex-wrap gap-2 justify-end">
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => onResolve('dismissed')}>
                Ignorar
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => onResolve('rejected')}>
                <XCircle className="h-4 w-4 mr-1" />
                Rejeitar
              </Button>
              <Button size="sm" disabled={isPending} onClick={() => onResolve('accepted')}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Aceitar sugestão
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </li>
  );
}

function safeJson(v: any) {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}
