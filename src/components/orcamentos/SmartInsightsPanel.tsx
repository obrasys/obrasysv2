import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  Loader2,
  Lightbulb,
  RefreshCw,
  Sparkles,
  X,
  TrendingDown,
  AlertCircle,
  PackageMinus,
} from 'lucide-react';
import { useAIBudgetInsights, AIBudgetInsight } from '@/hooks/useAIBudgetInsights';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SmartInsightsPanelProps {
  budgetId: string;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    badge: 'destructive' as const,
  },
  warn: {
    icon: AlertCircle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-300 dark:border-amber-700',
    badge: 'outline' as const,
  },
  info: {
    icon: Lightbulb,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'secondary' as const,
  },
};

const TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  missing_sections: PackageMinus,
  missing_items: PackageMinus,
  outlier_prices: TrendingDown,
  low_margin: AlertTriangle,
  parametric_suggestion: Sparkles,
};

function formatImpact(insight: AIBudgetInsight): string | null {
  if (insight.impact_value) {
    return `${insight.impact_value > 0 ? '+' : ''}${insight.impact_value.toFixed(2)}€`;
  }
  if (insight.impact_percent) {
    return `${insight.impact_percent > 0 ? '+' : ''}${insight.impact_percent.toFixed(1)}%`;
  }
  return null;
}

function InsightCard({
  insight,
  onApply,
  onDismiss,
  isApplying,
  isDismissing,
}: {
  insight: AIBudgetInsight;
  onApply: () => void;
  onDismiss: () => void;
  isApplying: boolean;
  isDismissing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[insight.severity];
  const TypeIcon = TYPE_ICONS[insight.type] || Lightbulb;
  const impact = formatImpact(insight);

  if (insight.status !== 'open') return null;

  return (
    <div className={`rounded-lg border p-3 ${config.bg} ${config.border} space-y-2`}>
      <div className="flex items-start gap-2">
        <TypeIcon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium leading-tight">{insight.title}</span>
            {impact && (
              <Badge variant={config.badge} className="text-xs shrink-0">
                {impact}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.message}</p>
        </div>
      </div>

      {/* Details collapsible */}
      {insight.payload && Object.keys(insight.payload).length > 0 && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
              <Eye className="h-3 w-3" />
              {expanded ? 'Ocultar' : 'Ver detalhes'}
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="text-xs bg-background/50 rounded p-2 mt-1 space-y-1">
              {insight.payload.suggested_chapter && (
                <p><span className="font-medium">Capítulo sugerido:</span> {insight.payload.suggested_chapter}</p>
              )}
              {insight.payload.suggested_item && (
                <p><span className="font-medium">Item sugerido:</span> {insight.payload.suggested_item}</p>
              )}
              {insight.payload.current_price != null && (
                <p><span className="font-medium">Preço atual:</span> {insight.payload.current_price}€</p>
              )}
              {insight.payload.avg_price != null && (
                <p><span className="font-medium">Média histórica:</span> {insight.payload.avg_price}€</p>
              )}
              {insight.payload.current_margin != null && (
                <p><span className="font-medium">Margem atual:</span> {insight.payload.current_margin}%</p>
              )}
              {insight.payload.min_margin != null && (
                <p><span className="font-medium">Margem mínima:</span> {insight.payload.min_margin}%</p>
              )}
              {insight.payload.typology && (
                <p><span className="font-medium">Tipologia:</span> {insight.payload.typology}</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Actions */}
      <div className="flex gap-1.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs"
                onClick={onApply}
                disabled={isApplying || isDismissing}
              >
                {isApplying ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-3 w-3 mr-1" />
                )}
                Aplicar
              </Button>
            </TooltipTrigger>
            <TooltipContent>Aplicar esta sugestão ao orçamento</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={onDismiss}
          disabled={isApplying || isDismissing}
        >
          {isDismissing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <X className="h-3 w-3 mr-1" />}
          Ignorar
        </Button>
      </div>
    </div>
  );
}

export function SmartInsightsPanel({ budgetId }: SmartInsightsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const {
    openInsights,
    counts,
    isLoading,
    analyzebudget,
    applyInsight,
    dismissInsight,
  } = useAIBudgetInsights(budgetId);

  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const handleApply = async (insightId: string) => {
    setApplyingId(insightId);
    try {
      await applyInsight.mutateAsync(insightId);
    } finally {
      setApplyingId(null);
    }
  };

  const handleDismiss = async (insightId: string) => {
    setDismissingId(insightId);
    try {
      await dismissInsight.mutateAsync(insightId);
    } finally {
      setDismissingId(null);
    }
  };

  return (
    <Card className="border-primary/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Sugestões Inteligentes
                {counts.total > 0 && (
                  <Badge variant="default" className="text-xs h-5 min-w-5 justify-center">
                    {counts.total}
                  </Badge>
                )}
              </CardTitle>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            {/* Counters */}
            {counts.total > 0 && (
              <div className="flex gap-2 flex-wrap">
                {counts.missing > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <PackageMinus className="h-3 w-3" />
                    Em falta: {counts.missing}
                  </Badge>
                )}
                {counts.outlier > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <TrendingDown className="h-3 w-3" />
                    Fora do padrão: {counts.outlier}
                  </Badge>
                )}
                {counts.margin > 0 && (
                  <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/30">
                    <AlertTriangle className="h-3 w-3" />
                    Margem: {counts.margin}
                  </Badge>
                )}
              </div>
            )}

            <Separator />

            {/* Analyze button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => analyzebudget.mutate(budgetId)}
              disabled={analyzebudget.isPending}
            >
              {analyzebudget.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {analyzebudget.isPending ? 'A analisar...' : 'Reanalisar'}
            </Button>

            {/* Insights list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : openInsights.length > 0 ? (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2 pr-2">
                  {openInsights.map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      onApply={() => handleApply(insight.id)}
                      onDismiss={() => handleDismiss(insight.id)}
                      isApplying={applyingId === insight.id}
                      isDismissing={dismissingId === insight.id}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-4">
                <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Nenhuma sugestão pendente. Clique em &quot;Reanalisar&quot; para verificar.
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
