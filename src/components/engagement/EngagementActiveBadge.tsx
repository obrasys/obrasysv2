import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function EngagementActiveBadge() {
  return (
    <Badge
      variant="secondary"
      className="bg-green-100 text-green-700 border-green-200 gap-1 text-xs"
    >
      <CheckCircle2 className="w-3 h-3" />
      Utilizador ativo
    </Badge>
  );
}
