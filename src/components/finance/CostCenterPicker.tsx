import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCostCenters } from '@/hooks/useCostCenters';
import type { CostCenterType } from '@/types/cost-center';

interface Props {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  type?: CostCenterType;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}

/**
 * Seletor de Centro de Custo (CE ou OB).
 * Opcional: omitir `type` para listar tudo.
 */
export function CostCenterPicker({
  value,
  onChange,
  type,
  placeholder = 'Centro de custo',
  allowClear = true,
  className,
}: Props) {
  const { data: centers = [], isLoading } = useCostCenters({ type, activeOnly: true });

  const grouped = useMemo(() => {
    const estrutura = centers.filter((c) => c.type === 'estrutura');
    const obras = centers.filter((c) => c.type === 'obra');
    return { estrutura, obras };
  }, [centers]);

  return (
    <Select
      value={value ?? '__none__'}
      onValueChange={(v) => onChange(v === '__none__' ? null : v)}
      disabled={isLoading}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowClear && <SelectItem value="__none__">— Sem centro de custo —</SelectItem>}
        {grouped.estrutura.length > 0 && (
          <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Estrutura</div>
        )}
        {grouped.estrutura.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="font-mono text-xs mr-2">{c.code}</span>
            {c.name}
          </SelectItem>
        ))}
        {grouped.obras.length > 0 && (
          <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Obras</div>
        )}
        {grouped.obras.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="font-mono text-xs mr-2">{c.code}</span>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
