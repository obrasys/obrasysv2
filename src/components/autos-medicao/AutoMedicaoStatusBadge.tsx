import { Badge } from '@/components/ui/badge';
import { ESTADOS_AUTO } from '@/types/autos-medicao';

interface AutoMedicaoStatusBadgeProps {
  estado: string;
}

export function AutoMedicaoStatusBadge({ estado }: AutoMedicaoStatusBadgeProps) {
  const estadoConfig = ESTADOS_AUTO.find(e => e.value === estado) || ESTADOS_AUTO[0];

  return (
    <Badge className={estadoConfig.color}>
      {estadoConfig.label}
    </Badge>
  );
}
