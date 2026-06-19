import { useNavigate } from "react-router-dom";
import { AlertTriangle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

export function TrialExpiredModal() {
  const navigate = useNavigate();
  const { subscription, loading, isTrialExpired } = useSubscription();

  if (loading || !subscription) return null;
  if (subscription.subscribed) return null;
  if (!isTrialExpired()) return null;

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <DialogTitle className="text-2xl">Trial Expirado</DialogTitle>
          <DialogDescription className="text-base">
            O seu período de trial de 30 dias chegou ao fim. Para continuar a usar o Obra Sys, escolha um dos planos: Starter, Professional ou Promotor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-6">
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={() => navigate("/planos?trial=expired")}
          >
            <Sparkles className="w-5 h-5" />
            Ver Planos e Assinar
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Os seus dados estão seguros e serão mantidos durante 30 dias após a expiração do trial.
        </p>
      </DialogContent>
    </Dialog>
  );
}

