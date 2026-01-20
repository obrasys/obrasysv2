import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

export function TrialBanner() {
  const navigate = useNavigate();
  const { subscription, loading, trialDaysRemaining, isTrialExpired } = useSubscription();

  if (loading || !subscription) return null;
  if (subscription.subscribed) return null;

  const daysLeft = trialDaysRemaining();
  const expired = isTrialExpired();

  // Don't show banner if more than 7 days remaining
  if (daysLeft > 7 && !expired) return null;

  // Determine urgency level
  const getUrgencyStyles = () => {
    if (expired) {
      return {
        bg: "bg-destructive/10 border-destructive/20",
        text: "text-destructive",
        icon: AlertTriangle,
      };
    }
    if (daysLeft <= 3) {
      return {
        bg: "bg-orange-500/10 border-orange-500/20",
        text: "text-orange-600 dark:text-orange-400",
        icon: AlertTriangle,
      };
    }
    return {
      bg: "bg-yellow-500/10 border-yellow-500/20",
      text: "text-yellow-600 dark:text-yellow-400",
      icon: Clock,
    };
  };

  const styles = getUrgencyStyles();
  const Icon = styles.icon;

  return (
    <div className={`${styles.bg} border-b px-6 py-3 flex items-center justify-between shrink-0`}>
      <div className={`flex items-center gap-3 ${styles.text}`}>
        <Icon className="w-5 h-5" />
        <span className="font-medium">
          {expired ? (
            "O seu período de trial expirou. Atualize para continuar a usar o ObraSys."
          ) : daysLeft === 1 ? (
            "O seu trial expira amanhã! Atualize agora para não perder acesso."
          ) : (
            `O seu trial expira em ${daysLeft} dias. Escolha um plano para continuar.`
          )}
        </span>
      </div>
      <Button 
        variant="accent" 
        size="sm" 
        onClick={() => navigate("/planos")}
        className="gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Ver planos
      </Button>
    </div>
  );
}
