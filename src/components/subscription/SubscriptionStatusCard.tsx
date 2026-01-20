import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Calendar, CreditCard, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Subscription } from "@/hooks/useSubscription";

interface SubscriptionStatusCardProps {
  subscription: Subscription | null;
  loading: boolean;
  trialDaysRemaining: number;
  isTrialExpired: boolean;
  onManageSubscription: () => void;
}

const tierLabels: Record<string, string> = {
  trial: "Trial Gratuito",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

const tierColors: Record<string, string> = {
  trial: "bg-muted text-muted-foreground",
  starter: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  professional: "bg-primary/10 text-primary",
  enterprise: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

const statusLabels: Record<string, string> = {
  trialing: "Em Trial",
  active: "Ativo",
  canceled: "Cancelado",
  past_due: "Pagamento Pendente",
};

const statusColors: Record<string, string> = {
  trialing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  canceled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  past_due: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export function SubscriptionStatusCard({
  subscription,
  loading,
  trialDaysRemaining,
  isTrialExpired,
  onManageSubscription,
}: SubscriptionStatusCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            A carregar...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Sem Subscrição
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Não foi possível carregar informações da subscrição.
          </p>
        </CardContent>
      </Card>
    );
  }

  const tier = subscription.subscription_tier;
  const status = subscription.subscription_status;
  const endDate = subscription.subscription_end
    ? new Date(subscription.subscription_end)
    : null;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            A Sua Subscrição
          </CardTitle>
          <div className="flex gap-2">
            <Badge className={tierColors[tier] || tierColors.trial}>
              {tierLabels[tier] || tier}
            </Badge>
            <Badge className={statusColors[status] || statusColors.trialing}>
              {statusLabels[status] || status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trial Warning */}
        {status === "trialing" && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            isTrialExpired 
              ? "bg-destructive/10 text-destructive" 
              : trialDaysRemaining <= 7 
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" 
                : "bg-muted"
          }`}>
            <AlertTriangle className="h-4 w-4" />
            {isTrialExpired ? (
              <span className="text-sm font-medium">
                O seu período de trial expirou. Faça upgrade para continuar.
              </span>
            ) : (
              <span className="text-sm font-medium">
                {trialDaysRemaining} {trialDaysRemaining === 1 ? "dia" : "dias"} restantes no trial
              </span>
            )}
          </div>
        )}

        {/* Subscription Details */}
        <div className="grid gap-3">
          {endDate && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {status === "trialing" ? "Trial expira a:" : "Próxima renovação:"}
              </span>
              <span className="font-medium">
                {format(endDate, "d 'de' MMMM 'de' yyyy", { locale: pt })}
              </span>
            </div>
          )}
          
          {subscription.subscribed && (
            <div className="flex items-center gap-3 text-sm">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Faturação:</span>
              <span className="font-medium">Mensal</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {subscription.subscribed && (
          <div className="pt-4 border-t">
            <Button variant="outline" onClick={onManageSubscription}>
              <CreditCard className="h-4 w-4 mr-2" />
              Gerir Pagamentos
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
