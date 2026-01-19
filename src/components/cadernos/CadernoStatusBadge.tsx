import { Badge } from "@/components/ui/badge";
import { CADERNO_STATUS_CONFIG, type CadernoStatus } from "@/types/cadernos";
import { cn } from "@/lib/utils";

interface CadernoStatusBadgeProps {
  status: CadernoStatus;
  className?: string;
}

export function CadernoStatusBadge({ status, className }: CadernoStatusBadgeProps) {
  const config = CADERNO_STATUS_CONFIG[status];

  return (
    <Badge
      variant="secondary"
      className={cn(config.bgColor, config.color, className)}
    >
      {config.label}
    </Badge>
  );
}
