import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { PageHeader } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, XCircle, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionStatusCard } from "@/components/subscription/SubscriptionStatusCard";
import { PaymentHistoryTable } from "@/components/subscription/PaymentHistoryTable";
import { PlanComparisonCard } from "@/components/subscription/PlanComparisonCard";

export default function SubscricaoPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    subscription,
    loading,
    createCheckout,
    openCustomerPortal,
    isTrialExpired,
    trialDaysRemaining,
  } = useSubscription();
  
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleSelectPlan = async (priceId: string, planName: string) => {
    if (!priceId.startsWith("price_")) {
      toast({
        title: "Plano indisponível",
        description: "Este plano ainda não está disponível para subscrição.",
        variant: "destructive",
      });
      return;
    }

    setCheckoutLoading(true);
    try {
      await createCheckout(priceId, planName);
      toast({
        title: "A redirecionar...",
        description: "Será redirecionado para a página de pagamento.",
      });
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o checkout. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error("Portal error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o portal. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setPortalLoading(true);
    try {
      await openCustomerPortal();
      toast({
        title: "Portal Stripe",
        description: "Use o portal para cancelar a sua subscrição.",
      });
    } catch (error) {
      console.error("Cancel error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o portal. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <AppLayout
      title="Gestão de Subscrição"
      subtitle="Gerir o seu plano, ver histórico e alterar opções de pagamento"
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <PageHeader
          eyebrow="Conta"
          title="Gestão de Subscrição"
          subtitle="Gerir o seu plano, ver histórico e alterar opções de pagamento"
          actions={
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          }
        />
        {/* Current Subscription Status */}
        <SubscriptionStatusCard
          subscription={subscription}
          loading={loading}
          trialDaysRemaining={trialDaysRemaining()}
          isTrialExpired={isTrialExpired()}
          onManageSubscription={handleManageSubscription}
        />

        {/* Plan Comparison */}
        <PlanComparisonCard
          currentTier={subscription?.subscription_tier || "trial"}
          onSelectPlan={handleSelectPlan}
          loading={checkoutLoading}
        />

        {/* Payment History */}
        <PaymentHistoryTable />

        {/* Cancel Subscription */}
        {subscription?.subscribed && !subscription?.is_founder && subscription?.subscription_tier !== "founder" && (
          <div className="border rounded-lg p-6 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  Cancelar Subscrição
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Pode cancelar a sua subscrição a qualquer momento. Continuará com acesso até ao final do período pago.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={portalLoading}>
                    {portalLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Cancelar"
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ao cancelar a subscrição, perderá acesso às funcionalidades premium
                      no final do período de faturação atual. Esta ação pode ser revertida
                      enquanto o período não terminar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Manter Subscrição</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleCancelSubscription}
                    >
                      Confirmar Cancelamento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
