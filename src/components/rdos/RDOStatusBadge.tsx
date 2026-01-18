import { Badge } from '@/components/ui/badge';
import type { RDOStatus } from '@/types/rdos';
import { RDO_STATUS_CONFIG } from '@/types/rdos';

interface RDOStatusBadgeProps {
  status: RDOStatus;
}

export function RDOStatusBadge({ status }: RDOStatusBadgeProps) {
  const config = RDO_STATUS_CONFIG[status];

  return (
    <Badge 
      variant="outline" 
      className={`${config.bgColor} ${config.color} border-0`}
    >
      {config.label}
    </Badge>
  );
}
