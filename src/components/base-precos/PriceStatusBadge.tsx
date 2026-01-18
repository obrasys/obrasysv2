import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PriceRawStatus } from "@/types/base-precos";

interface PriceStatusBadgeProps {
  status: PriceRawStatus;
}

const statusConfig: Record<
  PriceRawStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pendente",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  accepted: {
    label: "Aceite",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  rejected: {
    label: "Rejeitado",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  penalized: {
    label: "Penalizado",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
};

export function PriceStatusBadge({ status }: PriceStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
