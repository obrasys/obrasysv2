import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PriceConfidenceBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function PriceConfidenceBadge({
  score,
  showLabel = true,
  size = "md",
}: PriceConfidenceBadgeProps) {
  const getVariant = () => {
    if (score >= 80) return "success";
    if (score >= 50) return "warning";
    return "destructive";
  };

  const getLabel = () => {
    if (score >= 80) return "Alta";
    if (score >= 50) return "Média";
    return "Baixa";
  };

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const variant = getVariant();

  return (
    <Badge
      className={cn(
        sizeClasses[size],
        "font-medium",
        variant === "success" && "bg-green-100 text-green-800 hover:bg-green-100",
        variant === "warning" && "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
        variant === "destructive" && "bg-red-100 text-red-800 hover:bg-red-100"
      )}
    >
      {score}%{showLabel && ` - ${getLabel()}`}
    </Badge>
  );
}
