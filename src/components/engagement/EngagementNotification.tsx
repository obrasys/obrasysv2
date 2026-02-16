import { useNavigate } from 'react-router-dom';
import { ClipboardList, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EngagementNotificationProps {
  onDismiss: () => void;
}

export function EngagementNotification({ onDismiss }: EngagementNotificationProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0 mt-0.5">
          <ClipboardList className="w-4 h-4 text-yellow-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">O seu orçamento está pronto?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Continue a adicionar registos para tirar o máximo partido da plataforma.
          </p>
          <Button
            variant="link"
            size="sm"
            className="px-0 h-auto mt-1 text-xs"
            onClick={() => {
              onDismiss();
              navigate('/orcamentos');
            }}
          >
            Abrir orçamentos →
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
          onClick={onDismiss}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
