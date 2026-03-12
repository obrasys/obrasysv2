import { cn } from '@/lib/utils';
import { BUDGET_TYPES, type BudgetType } from '@/types/orcamento-essencial';
import { Badge } from '@/components/ui/badge';

interface Props {
  value: BudgetType | null;
  onChange: (type: BudgetType) => void;
}

export function BudgetTypeSelector({ value, onChange }: Props) {
  return (
    <div className="rounded-2xl bg-primary/5 p-6 md:p-8">
      <h2 className="text-lg md:text-xl font-bold text-foreground mb-5">O que queres orçamentar?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {BUDGET_TYPES.map((t) => {
          const selected = value === t.value;
          return (
            <button
              key={t.value}
              onClick={() => onChange(t.value)}
              className={cn(
                'relative text-left p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                'hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                selected
                  ? 'border-primary bg-card shadow-md'
                  : 'border-transparent bg-card hover:border-border'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-foreground">{t.label}</span>
                {selected && (
                  <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                    Selecionado
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
