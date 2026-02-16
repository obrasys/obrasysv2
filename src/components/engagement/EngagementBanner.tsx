import { useNavigate } from 'react-router-dom';
import { Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EngagementBannerProps {
  onDismiss: () => void;
}

export function EngagementBanner({ onDismiss }: EngagementBannerProps) {
  const navigate = useNavigate();

  return (
    <div className="relative bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border border-accent/20 rounded-xl p-4 md:p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
        <Building2 className="w-5 h-5 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-sm md:text-base">
          Comece criando a sua primeira obra
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
          Leva menos de 2 minutos para registar. Configure o seu primeiro projeto agora.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={() => navigate('/obras/criar')}
          className="whitespace-nowrap"
        >
          Criar Obra
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
