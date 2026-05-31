import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Sparkles } from 'lucide-react';
import type { FoundationOptionDef } from '@/lib/icf-foundation-suggestions';

interface Props {
  option: FoundationOptionDef;
  selected: boolean;
  baseIcfWallLength: number;
  /** Defaults derivados dos dados da planta (área, perímetro, comprimento). Sobrepõe-se aos defaults estáticos quando estes são 0. */
  defaultsOverride?: Record<string, number>;
  onApply: (params: Record<string, number | boolean>) => void;
  isPending?: boolean;
}

export function FoundationOptionCard({ option, selected, baseIcfWallLength, defaultsOverride, onApply, isPending }: Props) {
  const [params, setParams] = useState<Record<string, number | boolean>>(() => {
    const defaults: Record<string, number | boolean> = {};
    option.fields.forEach((f) => {
      const base = (f.defaultValue ?? (f.type === 'boolean' ? false : 0)) as number | boolean;
      // Se o default estático é 0 (campos como area/perimetro/comprimento) e temos um valor
      // derivado da planta, usar esse valor em vez de 0.
      if (f.type === 'number' && (base === 0 || base === undefined) && defaultsOverride && typeof defaultsOverride[f.name] === 'number' && defaultsOverride[f.name] > 0) {
        defaults[f.name] = defaultsOverride[f.name];
      } else {
        defaults[f.name] = base;
      }
    });
    return defaults;
  });

  return (
    <Card className={`rounded-xl ${selected ? 'border-primary' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          {option.label}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{option.description}</p>
        <p className="text-xs text-muted-foreground italic">Quando usar: {option.whenToUse}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {option.fields.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {option.fields.map((f) => (
              <div key={f.name} className="space-y-1">
                <Label className="text-xs">{f.label}{f.unit ? ` (${f.unit})` : ''}</Label>
                {f.type === 'boolean' ? (
                  <div className="flex items-center h-9">
                    <Switch
                      checked={!!params[f.name]}
                      onCheckedChange={(v) => setParams((p) => ({ ...p, [f.name]: v }))}
                    />
                  </div>
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    value={typeof params[f.name] === 'number' ? String(params[f.name]) : ''}
                    onChange={(e) => setParams((p) => ({ ...p, [f.name]: parseFloat(e.target.value) || 0 }))}
                    className="h-9"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 text-xs bg-destructive/10 text-destructive p-2 rounded-md">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Sugestão preliminar para orçamento - requer validação técnica/engenheiro.</span>
        </div>

        <Button
          size="sm"
          className="w-full"
          disabled={isPending}
          onClick={() => onApply(params)}
        >
          {selected ? 'Atualizar sugestão' : 'Usar esta opção'}
        </Button>
        {option.key !== 'nenhuma' && baseIcfWallLength > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Base de cálculo: {baseIcfWallLength.toFixed(2)} m de paredes ICF selecionadas
          </p>
        )}
      </CardContent>
    </Card>
  );
}
