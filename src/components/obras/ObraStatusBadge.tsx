import { Badge } from '@/components/ui/badge';
import type { ObraStatus } from '@/types/obras';
import { OBRA_STATUS_CONFIG } from '@/types/obras';

interface ObraStatusBadgeProps {
  status: ObraStatus;
  size?: 'sm' | 'default';
}

export function ObraStatusBadge({ status, size = 'default' }: ObraStatusBadgeProps) {
  const config = OBRA_STATUS_CONFIG[status] || OBRA_STATUS_CONFIG.planeamento;

  return (
    <Badge 
      className={`${config.bgColor} ${config.color} border-0 ${size === 'sm' ? 'text-xs px-2 py-0.5' : ''}`}
    >
      {config.label}
    </Badge>
  );
}
