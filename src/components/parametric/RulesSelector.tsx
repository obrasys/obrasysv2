import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Check } from 'lucide-react';
import type { ParametricRule, ConstructiveElement } from '@/types/parametric';
import { CONSTRUCTION_METHODS } from '@/types/parametric';

interface RulesSelectorProps {
  rules: ParametricRule[];
  element: ConstructiveElement | null;
  selectedRuleId?: string | null;
  onSelectRule: (rule: ParametricRule) => void;
  isLoading?: boolean;
}

export function RulesSelector({
  rules,
  element,
  selectedRuleId,
  onSelectRule,
  isLoading,
}: RulesSelectorProps) {
  // Filtrar regras compatíveis com o elemento
  const compatibleRules = element
    ? rules.filter(
        (rule) =>
          rule.element_type === element.element_type &&
          rule.construction_method === element.construction_method
      )
    : [];

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
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Regras para {CONSTRUCTION_METHODS[element.construction_method].label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {compatibleRules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 px-4">
            Nenhuma regra disponível para este método construtivo
          </p>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-1 p-4 pt-0">
              {compatibleRules.map((rule) => (
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
                      <Check className="h-4 w-4 text-primary" />
                    )}
                    <div>
                      <div className="font-medium">{rule.rule_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Base: {rule.base_parameter} × {rule.coefficient}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {rule.unit}
                    </Badge>
                    {rule.is_system && (
                      <Badge variant="secondary" className="text-xs">
                        Sistema
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
