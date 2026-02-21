import { useEffect, useRef, useState } from 'react';
import { AxiaIcon } from './AxiaIcon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AxiaStatusBadgeProps {
  criticalCount: number;
  warnCount: number;
  total: number;
  isLoading?: boolean;
}

type AxiaStatus = 'equilibrada' | 'atencao' | 'risco';

const STATUS_CONFIG: Record<AxiaStatus, { label: string; tooltip: string; dotColor: string; textColor: string; bgColor: string; borderColor: string }> = {
  equilibrada: {
    label: 'Configuração equilibrada',
    tooltip: 'Nenhum risco ou alerta identificado. O orçamento está equilibrado.',
    dotColor: 'bg-emerald-500',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  atencao: {
    label: 'Atenção à margem',
    tooltip: 'Existem alertas que requerem a sua atenção para proteger a margem.',
    dotColor: 'bg-amber-500',
    textColor: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  risco: {
    label: 'Risco de desvio identificado',
    tooltip: 'Foram identificados riscos críticos no orçamento que necessitam de ação imediata.',
    dotColor: 'bg-red-500',
    textColor: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
  },
};

function getStatus(criticalCount: number, warnCount: number): AxiaStatus {
  if (criticalCount > 0) return 'risco';
  if (warnCount > 0) return 'atencao';
  return 'equilibrada';
}

export function AxiaStatusBadge({ criticalCount, warnCount, total, isLoading }: AxiaStatusBadgeProps) {
  const status = getStatus(criticalCount, warnCount);
  const config = STATUS_CONFIG[status];
  const prevTotal = useRef(total);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (total > 0 && prevTotal.current === 0) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(t);
    }
    prevTotal.current = total;
  }, [total]);

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-muted/50 text-xs text-muted-foreground">
        <AxiaIcon size={14} className="animate-spin text-[#7C3AED]" />
        <span className="font-medium">Axia a analisar...</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-500 cursor-default',
              config.bgColor,
              config.borderColor,
              config.textColor,
              pulse && 'animate-pulse'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full shrink-0', config.dotColor)} />
            <AxiaIcon size={14} className="text-[#7C3AED]" />
            <span>Axia: {config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
