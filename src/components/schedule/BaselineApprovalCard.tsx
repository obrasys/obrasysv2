import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Clock } from 'lucide-react';
import type { ScheduleVersion } from '@/types/schedule';

interface Props {
  version: ScheduleVersion;
  onApprove: () => void;
  isApproving: boolean;
}

export function BaselineApprovalCard({ version, onApprove, isApproving }: Props) {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-medium">Cronograma pendente de validação</p>
            <p className="text-xs text-muted-foreground">
              Versão {version.version_no} - {version.type === 'estimated' ? 'Estimado' : 'Revisão'} - 
              Revise as tarefas e aprove como baseline oficial.
            </p>
          </div>
        </div>
        <Button
          onClick={onApprove}
          disabled={isApproving}
          className="bg-green-600 hover:bg-green-700"
        >
          <ShieldCheck className="h-4 w-4 mr-2" />
          {isApproving ? 'A aprovar...' : 'Aprovar Baseline'}
        </Button>
      </CardContent>
    </Card>
  );
}
