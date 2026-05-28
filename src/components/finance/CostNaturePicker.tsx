import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COST_NATURE_LABELS, COST_NATURE_OPTIONS, type CostNature } from '@/types/cost-center';

interface Props {
  value: CostNature | null | undefined;
  onChange: (v: CostNature | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}

/** Seletor de Natureza de Custo (MO, MAT, SRV, INS, ALU, DIV). */
export function CostNaturePicker({
  value,
  onChange,
  placeholder = 'Natureza de custo',
  allowClear = true,
  className,
}: Props) {
  return (
    <Select
      value={value ?? '__none__'}
      onValueChange={(v) => onChange(v === '__none__' ? null : (v as CostNature))}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowClear && <SelectItem value="__none__">- Sem natureza -</SelectItem>}
        {COST_NATURE_OPTIONS.map((c) => (
          <SelectItem key={c} value={c}>
            <span className="font-mono text-xs mr-2">{c}</span>
            {COST_NATURE_LABELS[c]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
