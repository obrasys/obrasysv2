import { Badge } from "@/components/ui/badge";
import { getNivelConfianca } from "@/types/cadernos";
import { cn } from "@/lib/utils";

interface CadernoMatchBadgeProps {
  confianca: number;
  showPercentage?: boolean;
  className?: string;
}

export function CadernoMatchBadge({ confianca, showPercentage = true, className }: CadernoMatchBadgeProps) {
  const config = getNivelConfianca(confianca);

  return (
    <Badge
      variant="secondary"
      className={cn(config.bgColor, config.color, className)}
    >
      {config.label}
      {showPercentage && ` (${confianca}%)`}
    </Badge>
  );
}
