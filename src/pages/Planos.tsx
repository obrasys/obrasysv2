import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PricingCard } from "@/components/subscription/PricingCard";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";

const PLANS = [
  {
    name: "Starter",
    description: "Para profissionais independentes",
    priceMonthly: 49,
    priceYearly: 490,
    features: [
      "Até 2 obras ativas",
      "1 utilizador incluído",
      "Controlo de orçamentos",
      "Gestão de documentos",
      "Aplicação móvel",
      "Suporte por email",
    ],
    stripePriceIdMonthly: "price_1T6YkuP3LW226r1jyUAL0kOF",
    stripePriceIdYearly: "",
  },
  {
    name: "Professional",
    description: "Para equipas de construção",
    priceMonthly: 99,
    priceYearly: 990,
    features: [
      "Obras ilimitadas",
      "10 utilizadores incluídos",
      "Tudo do plano Starter",
      "Gestão de equipas avançada",
      "Relatórios personalizados",
      "Suporte prioritário",
    ],
    stripePriceIdMonthly: "price_1T6YkuP3LW226r1jYq5OMNbU",
    stripePriceIdYearly: "",
    isPopular: true,
  },
  {
    name: "Enterprise",
    description: "Para grandes construtoras",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "Tudo do Professional",
      "Utilizadores ilimitados",
      "API de integração",
      "SSO/SAML",
      "Integrações personalizadas",
      "Gestor de conta dedicado",
      "SLA garantido",
    ],
    isEnterprise: true,
  },
];

export default function PlanosPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscription, createCheckout, loading: subscriptionLoading } = useSubscription();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleSelectPlan = async (priceId: string, planName: string) => {
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
              Escolha o plano ideal para o seu negócio
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Label 
            htmlFor="billing-toggle" 
            className={billingPeriod === "monthly" ? "font-medium" : "text-muted-foreground"}
          >
            Mensal
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingPeriod === "yearly"}
            onCheckedChange={(checked) => setBillingPeriod(checked ? "yearly" : "monthly")}
          />
          <Label 
            htmlFor="billing-toggle" 
            className={billingPeriod === "yearly" ? "font-medium" : "text-muted-foreground"}
          >
            Anual
            <span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
              Poupa até 20%
            </span>
          </Label>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.name}
              name={plan.name}
              description={plan.description}
              priceMonthly={plan.priceMonthly}
              priceYearly={plan.priceYearly}
              features={plan.features}
              stripePriceId={
                billingPeriod === "monthly" 
                  ? plan.stripePriceIdMonthly 
                  : plan.stripePriceIdYearly
              }
              isPopular={plan.isPopular}
              isEnterprise={plan.isEnterprise}
              billingPeriod={billingPeriod}
              currentTier={subscription?.subscription_tier}
              onSelect={handleSelectPlan}
              loading={checkoutLoading === plan.name || subscriptionLoading}
            />
          ))}
        </div>

        {/* FAQ or additional info */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Todos os planos incluem 30 dias de trial gratuito. Cancele a qualquer momento.
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
