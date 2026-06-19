import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingCard } from "@/components/subscription/PricingCard";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PLAN_ORDER, PLANS, type PlanKey } from "@/config/plans";

export default function PlanosPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { subscription, createCheckout, loading: subscriptionLoading } = useSubscription();
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleSelectPlan = async (priceId: string, planName: string, planKey: PlanKey) => {
    // Se não autenticado, encaminhar para criar conta preservando plano selecionado
    if (!user) {
      navigate(`/criar-conta?plan=${planKey}`);
      return;
    }

    try {
      setCheckoutLoading(planName);
      await createCheckout(priceId, planName);
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o checkout. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const trialExpired = searchParams.get("trial") === "expired";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Planos e Preços</h1>
            <p className="text-sm text-muted-foreground">
              {trialExpired
                ? "O seu trial terminou. Escolha um plano para continuar."
                : "Escolha o plano ideal para o seu negócio"}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Pricing cards */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto items-stretch">
          {PLAN_ORDER.map((key) => {
            const plan = PLANS[key];
            return (
              <PricingCard
                key={plan.key}
                plan={plan}
                currentTier={subscription?.subscription_tier}
                onSelect={(priceId, name) => handleSelectPlan(priceId, name, plan.key)}
                loading={checkoutLoading === plan.name || subscriptionLoading}
              />
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Todos os planos incluem 30 dias de trial gratuito com acesso completo. Cancele a qualquer momento.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Precisa de ajuda? Contacte-nos em{" "}
            <a href="mailto:contacto@obrasys.pt" className="text-accent hover:underline">
              contacto@obrasys.pt
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
