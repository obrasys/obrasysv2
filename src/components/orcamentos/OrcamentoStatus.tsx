import { Badge } from '@/components/ui/badge';
import { STATUS_CONFIG, type OrcamentoStatus as Status } from '@/types/orcamentos';
import { cn } from '@/lib/utils';

interface OrcamentoStatusProps {
  status: Status;
  className?: string;
}

export function OrcamentoStatus({ status, className }: OrcamentoStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
