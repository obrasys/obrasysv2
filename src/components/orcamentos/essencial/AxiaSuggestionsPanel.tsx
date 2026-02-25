import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Check, X, Loader2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { AxiaSuggestion } from '@/hooks/useAxiaEssencial';

interface AxiaSuggestionsPanelProps {
  suggestions: AxiaSuggestion[];
  loading: boolean;
  onAccept: (suggestion: AxiaSuggestion) => void;
  onDismiss: (suggestion: AxiaSuggestion) => void;
}

export function AxiaSuggestionsPanel({
  suggestions,
  loading,
  onAccept,
  onDismiss,
}: AxiaSuggestionsPanelProps) {
  const visibleSuggestions = suggestions.filter(s => s.accepted === undefined);

  if (!loading && visibleSuggestions.length === 0) return null;

  return (
    <Card className="border-[hsl(var(--axia-purple,263_70%_50%))] border-opacity-30 bg-[hsl(263_70%_50%/0.04)]">
      <CardContent className="pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[hsl(263_70%_50%/0.12)]">
              <Lightbulb className="h-4 w-4 text-[#7C3AED]" />
            </div>
            <span className="text-sm font-semibold text-[#7C3AED]">Sugestões da Axia</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[250px]">
                <p className="text-xs">
                  Com base no tipo de obra e em padrões de orçamentos semelhantes. Os valores são apenas referências.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            A analisar o orçamento...
          </div>
        )}

        {visibleSuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-background border text-sm"
          >
            <p className="flex-1 text-foreground/80 leading-snug">{suggestion.message}</p>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-600 hover:bg-green-100 hover:text-green-700"
                onClick={() => onAccept(suggestion)}
                title="Aceitar"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:bg-muted"
                onClick={() => onDismiss(suggestion)}
                title="Ignorar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {suggestions.some(s => s.accepted === true) && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <Check className="h-3 w-3" />
            {suggestions.filter(s => s.accepted).length} sugestão(ões) aplicada(s)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
