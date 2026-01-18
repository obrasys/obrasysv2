import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Check, Info } from 'lucide-react';
import type { ParametricRule, ConstructiveElement, CompanyParametricCoefficient } from '@/types/parametric';
import { CONSTRUCTION_METHODS, TRADES } from '@/types/parametric';
import { CoefficientsEditor } from './CoefficientsEditor';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RulesSelectorProps {
  rules: ParametricRule[];
  element: ConstructiveElement | null;
  selectedRuleId?: string | null;
  onSelectRule: (rule: ParametricRule) => void;
  isLoading?: boolean;
  coefficients?: CompanyParametricCoefficient[];
  onSaveCoefficient?: (key: string, value: number) => void;
  onResetCoefficient?: (id: string) => void;
}

export function RulesSelector({
  rules,
  element,
  selectedRuleId,
  onSelectRule,
  isLoading,
  coefficients = [],
  onSaveCoefficient,
  onResetCoefficient,
}: RulesSelectorProps) {
  // Filtrar regras compatíveis com o elemento
  const compatibleRules = element
    ? rules.filter(
        (rule) =>
          rule.element_type === element.element_type &&
          rule.construction_method === element.construction_method
      )
    : [];

  // Agrupar regras por trade
  const rulesByTrade = compatibleRules.reduce((acc, rule) => {
    const trade = rule.trade || 'outros';
    if (!acc[trade]) acc[trade] = [];
    acc[trade].push(rule);
    return acc;
  }, {} as Record<string, ParametricRule[]>);

  const selectedRule = compatibleRules.find(r => r.id === selectedRuleId);

  if (!element) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Regras Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Selecione um elemento para ver as regras disponíveis
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Regras Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Regras para {CONSTRUCTION_METHODS[element.construction_method].label}
          </CardTitle>
          {selectedRule && onSaveCoefficient && onResetCoefficient && (
            <CoefficientsEditor
              rule={selectedRule}
              coefficients={coefficients}
              onSaveCoefficient={onSaveCoefficient}
              onResetCoefficient={onResetCoefficient}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {compatibleRules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 px-4">
            Nenhuma regra disponível para este método construtivo
          </p>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="p-4 pt-0 space-y-4">
              {Object.entries(rulesByTrade).map(([trade, tradeRules]) => (
                <div key={trade} className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {TRADES[trade] || trade}
                  </div>
                  {tradeRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedRuleId === rule.id
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted/50 border border-transparent'
                      }`}
                      onClick={() => onSelectRule(rule)}
                    >
                      <div className="flex items-center gap-3">
                        {selectedRuleId === rule.id && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{rule.rule_name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>Base: {rule.base_parameter}</span>
                            {rule.notes && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[250px]">
                                    <p className="text-xs">{rule.notes}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {rule.output_unit || rule.unit}
                        </Badge>
                        {rule.is_system && (
                          <Badge variant="secondary" className="text-xs">
                            PT/ES
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
