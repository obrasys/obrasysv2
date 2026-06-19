import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial',
  starter: 'Starter',
  professional: 'Professional',
  promotor: 'Promotor',
  enterprise: 'Enterprise',
  founder: 'Founder',
};

interface UpgradePromptModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  requiredPlan?: string;
  /** Current subscription tier key (e.g. 'trial', 'starter') */
  currentTier?: string;
  /** Optional usage detail to highlight the limit being hit */
  usage?: {
    label: string;
    current: number | string;
    limit: number | string;
  };
}

export function UpgradePromptModal({
  open,
  onClose,
  title = 'Funcionalidade premium',
  description = 'Esta funcionalidade não está disponível no seu plano atual.',
  requiredPlan = 'Professional',
  currentTier,
  usage,
}: UpgradePromptModalProps) {
  const navigate = useNavigate();
  const currentLabel = currentTier ? PLAN_LABELS[currentTier] ?? currentTier : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          {currentLabel && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
              <span className="text-xs text-muted-foreground">Plano atual</span>
              <Badge variant="secondary" className="font-medium">
                {currentLabel}
              </Badge>
            </div>
          )}

          {usage && (
            <div className="flex items-center justify-between rounded-xl border border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium">{usage.label}</span>
              </div>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                {usage.current} / {usage.limit}
              </span>
            </div>
          )}

          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Disponível no plano</span>
            <Badge className="font-medium">{requiredPlan}</Badge>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            className="flex-1 gap-2"
            onClick={() => {
              onClose();
              navigate('/planos');
            }}
          >
            <Sparkles className="w-4 h-4" />
            Fazer upgrade para {requiredPlan}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Mais tarde
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
