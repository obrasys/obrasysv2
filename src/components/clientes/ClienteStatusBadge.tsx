import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { NivelAcesso } from '@/types/clientes';
import { NIVEL_ACESSO_CONFIG } from '@/types/clientes';

interface ClienteStatusBadgeProps {
  nivel: NivelAcesso;
  showTooltip?: boolean;
}

export function ClienteStatusBadge({ nivel, showTooltip = true }: ClienteStatusBadgeProps) {
  const config = NIVEL_ACESSO_CONFIG[nivel];

  const badge = (
    <Badge 
      variant="outline" 
      className={`${config.bgColor} ${config.color} border-0`}
    >
      {config.label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
