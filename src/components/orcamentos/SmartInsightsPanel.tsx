import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  Loader2,
  Lightbulb,
  RefreshCw,
  X,
  TrendingDown,
  AlertCircle,
  PackageMinus,
} from 'lucide-react';
import { AxiaIcon } from '@/components/axia/AxiaIcon';
import { useAIBudgetInsights, AIBudgetInsight } from '@/hooks/useAIBudgetInsights';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface SmartInsightsPanelProps {
  budgetId: string;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warn: 1, info: 2 };

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
  parametric_suggestion: Lightbulb,
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
  const [showConfirm, setShowConfirm] = useState(false);
  const config = SEVERITY_CONFIG[insight.severity];
  const TypeIcon = TYPE_ICONS[insight.type] || Lightbulb;
  const impact = formatImpact(insight);

  if (insight.status !== 'open') return null;

  const handleApplyClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmApply = () => {
    setShowConfirm(false);
    onApply();
    toast.success('Atualização aplicada com sucesso por Axia');
  };

  return (
    <>
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
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{insight.message}</p>
          </div>
        </div>

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

        <div className="flex gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs bg-[#7C3AED] hover:bg-[#6D28D9]"
                  onClick={handleApplyClick}
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

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AxiaIcon size={20} className="text-[#7C3AED]" />
              Confirmar ação Axia
            </AlertDialogTitle>
            <AlertDialogDescription>
              Axia irá aplicar a sugestão &ldquo;{insight.title}&rdquo; ao orçamento. Esta ação pode adicionar ou modificar itens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApply} className="bg-[#7C3AED] hover:bg-[#6D28D9]">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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

  // Sort by severity and limit to 5
  const sortedInsights = [...openInsights]
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
    .slice(0, 5);

  // If no open insights and not loading, hide panel
  if (!isLoading && openInsights.length === 0) return null;

  return (
    <Card className="border-[#7C3AED]/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-sm flex items-center gap-2">
                <AxiaIcon size={16} className="text-[#7C3AED]" />
                <span>Axia Insights</span>
                {counts.total > 0 && (
                  <Badge variant="default" className="text-xs h-5 min-w-5 justify-center bg-[#7C3AED]">
                    {counts.total}
                  </Badge>
                )}
              </CardTitle>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </CollapsibleTrigger>
          <p className="text-[10px] text-muted-foreground mt-0.5">Análise estratégica do orçamento</p>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
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

            <Button
              variant="outline"
              size="sm"
              className="w-full border-[#7C3AED]/30 hover:bg-[#7C3AED]/10"
              onClick={() => analyzebudget.mutate(budgetId)}
              disabled={analyzebudget.isPending}
            >
              {analyzebudget.isPending ? (
                <>
                  <AxiaIcon size={14} className="animate-spin mr-2 text-[#7C3AED]" />
                  Axia a analisar...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reanalisar
                </>
              )}
            </Button>

            {isLoading ? (
              <div className="flex items-center justify-center py-4 gap-2">
                <AxiaIcon size={16} className="animate-spin text-[#7C3AED]" />
                <span className="text-xs text-muted-foreground">Axia a analisar...</span>
              </div>
            ) : sortedInsights.length > 0 ? (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2 pr-2">
                  {sortedInsights.map((insight) => (
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
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
