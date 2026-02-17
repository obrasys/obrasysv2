import { useNavigate } from 'react-router-dom';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onDismiss: () => void;
}

export function OnboardingInactiveReminder({ onDismiss }: Props) {
  const navigate = useNavigate();

  return (
    <div className="relative bg-gradient-to-r from-yellow-50 via-yellow-50/50 to-transparent dark:from-yellow-950/20 dark:via-yellow-950/10 border border-yellow-200/60 dark:border-yellow-800/30 rounded-xl p-4 md:p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center shrink-0">
        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-sm md:text-base">
          Ainda não criou a sua primeira obra?
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed">
          Muitos utilizadores desistem antes de perceber o verdadeiro valor do Obra Sys.
          Criar a primeira obra é o que desbloqueia toda a experiência. Quer que o ajudemos em 5 minutos?
        </p>
        <Button size="sm" variant="outline" className="mt-3 h-8" onClick={() => navigate('/suporte')}>
          Agendar Ajuda Rápida
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
        onClick={onDismiss}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
