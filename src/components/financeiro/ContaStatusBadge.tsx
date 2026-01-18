import { Badge } from '@/components/ui/badge';
import { TIPO_CONTA_CONFIG, type TipoConta } from '@/types/financeiro';

interface ContaStatusBadgeProps {
  tipo: TipoConta;
  pago?: boolean;
}

export function ContaStatusBadge({ tipo, pago }: ContaStatusBadgeProps) {
  const config = TIPO_CONTA_CONFIG[tipo];

  if (pago) {
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
        Pago
      </Badge>
    );
  }

  return (
    <Badge className={`${config.bgColor} ${config.color} hover:${config.bgColor}`}>
      {config.label}
    </Badge>
  );
}
