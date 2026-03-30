import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UpgradePromptModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  requiredPlan?: string;
}

export function UpgradePromptModal({
  open,
  onClose,
  title = 'Funcionalidade premium',
  description = 'Esta funcionalidade não está disponível no seu plano atual. Faça upgrade para desbloquear.',
  requiredPlan = 'Professional',
}: UpgradePromptModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            className="flex-1 gap-2"
            onClick={() => {
              onClose();
              navigate('/planos');
            }}
          >
            <Sparkles className="w-4 h-4" />
            Ver Plano {requiredPlan}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Mais tarde
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
