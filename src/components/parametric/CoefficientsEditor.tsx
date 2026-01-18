import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings2, RotateCcw, Save, Info } from 'lucide-react';
import { DEFAULT_COEFFICIENTS, TRADES } from '@/types/parametric';
import type { ParametricRule, CompanyParametricCoefficient } from '@/types/parametric';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CoefficientsEditorProps {
  rule: ParametricRule;
  coefficients: CompanyParametricCoefficient[];
  onSaveCoefficient: (key: string, value: number, isGlobal?: boolean) => void;
  onResetCoefficient: (id: string) => void;
  isLoading?: boolean;
}

export function CoefficientsEditor({
  rule,
  coefficients,
  onSaveCoefficient,
  onResetCoefficient,
  isLoading,
}: CoefficientsEditorProps) {
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  // Extrair chaves de coeficientes da fórmula da regra
  const formulaCoefficients = Object.keys(rule.defaults || {});
  
  // Adicionar coeficientes comuns que podem estar na fórmula
  const allCoefficientsInFormula = new Set<string>();
  const knownCoefficients = Object.keys(DEFAULT_COEFFICIENTS);
  
  knownCoefficients.forEach(key => {
    if (rule.formula.includes(key)) {
      allCoefficientsInFormula.add(key);
    }
  });
  
  formulaCoefficients.forEach(key => allCoefficientsInFormula.add(key));

  const getEffectiveValue = (key: string): number => {
    const override = coefficients.find(c => c.coefficient_key === key);
    if (override) return override.value;
    
    if (rule.defaults && rule.defaults[key] !== undefined) {
      return rule.defaults[key];
    }
    
    return DEFAULT_COEFFICIENTS[key]?.value ?? 1;
  };

  const getOverrideInfo = (key: string): CompanyParametricCoefficient | undefined => {
    return coefficients.find(c => c.coefficient_key === key);
  };

  const handleValueChange = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (key: string) => {
    const value = parseFloat(editedValues[key]);
    if (!isNaN(value)) {
      onSaveCoefficient(key, value);
      setEditedValues(prev => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleReset = (key: string) => {
    const override = getOverrideInfo(key);
    if (override) {
      onResetCoefficient(override.id);
    }
  };

  if (allCoefficientsInFormula.size === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Coeficientes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Coeficientes da Regra
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-sm font-medium">{rule.rule_name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {rule.trade && TRADES[rule.trade] ? TRADES[rule.trade] : rule.trade}
            </div>
            <code className="text-xs text-muted-foreground mt-2 block">
              {rule.formula}
            </code>
          </div>

          <Separator />

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-4 pr-4">
              {Array.from(allCoefficientsInFormula).map(key => {
                const defaultInfo = DEFAULT_COEFFICIENTS[key];
                const ruleDefault = rule.defaults?.[key];
                const effectiveValue = getEffectiveValue(key);
                const override = getOverrideInfo(key);
                const editedValue = editedValues[key];
                const hasEdit = editedValue !== undefined;

                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">{key}</Label>
                        {defaultInfo && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{defaultInfo.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  Unidade: {defaultInfo.unit}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {override && (
                          <Badge variant="secondary" className="text-xs">
                            {override.orcamento_id ? 'Projeto' : 'Global'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={hasEdit ? editedValue : effectiveValue.toString()}
                        onChange={(e) => handleValueChange(key, e.target.value)}
                        className="flex-1"
                        disabled={isLoading}
                      />
                      
                      {hasEdit && (
                        <Button
                          size="icon"
                          variant="default"
                          onClick={() => handleSave(key)}
                          disabled={isLoading}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {override && !hasEdit && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleReset(key)}
                          disabled={isLoading}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Padrão: {ruleDefault ?? defaultInfo?.value ?? 'N/A'}
                      {defaultInfo?.unit && ` ${defaultInfo.unit}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <Separator />

          <div className="text-xs text-muted-foreground">
            Os coeficientes personalizados são aplicados apenas a este orçamento. 
            Use o botão de reset para voltar ao valor padrão.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
