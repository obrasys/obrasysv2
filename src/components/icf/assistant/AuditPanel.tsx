import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScanLine, Calculator, Sparkles, UserCheck, AlertTriangle } from 'lucide-react';
import type { IcfAssistantItem, IcfSourceType } from '@/types/icf-assistant';
import { SourceBadge } from './SourceBadge';

interface Props {
  items: IcfAssistantItem[];
  onToggleConfirm: (item: IcfAssistantItem, confirmed: boolean) => void;
  onGeneratePre: () => void;
  onGenerateValidated: () => void;
  isGenerating?: boolean;
}

const GROUPS: { key: IcfSourceType | 'review'; label: string; Icon: typeof ScanLine; tone: string }[] = [
  { key: 'extraido_planta', label: 'Extraído da planta', Icon: ScanLine, tone: 'border-blue-500/30' },
  { key: 'calculado_sistema', label: 'Calculado pelo sistema', Icon: Calculator, tone: 'border-emerald-500/30' },
  { key: 'sugerido_axia', label: 'Sugerido pela Axia', Icon: Sparkles, tone: 'border-amber-500/30' },
  { key: 'review', label: 'Requer revisão', Icon: AlertTriangle, tone: 'border-destructive/40' },
];

export function AuditPanel({ items, onToggleConfirm, onGeneratePre, onGenerateValidated, isGenerating }: Props) {
  const confirmedCount = items.filter((i) => i.user_confirmed).length;

  const groupItems = (key: IcfSourceType | 'review') =>
    key === 'review'
      ? items.filter((i) => i.review_required && !i.user_confirmed)
      : items.filter((i) => i.source_type === key);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {GROUPS.map(({ key, label, Icon, tone }) => {
          const list = groupItems(key);
          return (
            <Card key={key} className={`rounded-xl border ${tone}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                  <Badge variant="secondary" className="ml-auto">{list.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {list.length === 0 && <p className="text-xs text-muted-foreground italic">Sem itens.</p>}
                {list.map((it) => (
                  <div key={it.id} className="flex items-start gap-2 text-xs border rounded-md p-2">
                    <Checkbox
                      checked={it.user_confirmed}
                      onCheckedChange={(v) => onToggleConfirm(it, !!v)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{it.reference || it.category}</span>
                        <span className="text-muted-foreground">
                          {it.quantity ?? '—'} {it.unit ?? ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <SourceBadge source={it.source_type} reviewRequired={it.review_required} />
                        <span className="text-muted-foreground">Confiança: {(Number(it.confidence) * 100).toFixed(0)}%</span>
                      </div>
                      {it.assumptions?.length > 0 && (
                        <ul className="mt-1 list-disc list-inside text-muted-foreground">
                          {it.assumptions.slice(0, 3).map((a, idx) => (
                            <li key={idx}>{a}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        <Button variant="outline" onClick={onGeneratePre} disabled={isGenerating || items.length === 0}>
          <Sparkles className="h-4 w-4 mr-2" />
          Gerar pré-orçamento ICF
        </Button>
        <Button onClick={onGenerateValidated} disabled={isGenerating || confirmedCount === 0}>
          <UserCheck className="h-4 w-4 mr-2" />
          Gerar orçamento validado ({confirmedCount})
        </Button>
      </div>
    </div>
  );
}
