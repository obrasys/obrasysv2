import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Zap, Building2, Rocket } from "lucide-react";
import { useState } from "react";

interface Plan {
  name: string;
  tier: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  priceIdMonthly: string;
  priceIdYearly: string;
  icon: React.ReactNode;
  popular?: boolean;
}

interface PlanComparisonCardProps {
  currentTier: string;
  onSelectPlan: (priceId: string, planName: string) => Promise<void>;
  loading: boolean;
}

const plans: Plan[] = [
  {
    name: "Starter",
    tier: "starter",
    description: "Para profissionais independentes",
    monthlyPrice: 49,
    yearlyPrice: 490,
    features: [
      "Até 5 obras ativas",
      "Orçamentos ilimitados",
      "Base de preços básica",
      "RDOs diários",
      "Suporte por email",
    ],
    priceIdMonthly: "price_1T6YkuP3LW226r1jyUAL0kOF",
    priceIdYearly: "",
    icon: <Zap className="h-5 w-5" />,
  },
  {
    name: "Professional",
    tier: "professional",
    description: "Para pequenas empresas de construção",
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: [
      "Obras ilimitadas",
      "Base de preços avançada com IA",
      "Relatórios personalizados",
      "Gestão financeira completa",
      "Controlo de conformidade",
      "Suporte prioritário",
    ],
    priceIdMonthly: "price_1T6YkuP3LW226r1jYq5OMNbU",
    priceIdYearly: "",
    icon: <Building2 className="h-5 w-5" />,
    popular: true,
  },
  {
    name: "Enterprise",
    tier: "enterprise",
    description: "Para grandes construtoras",
    monthlyPrice: 249,
    yearlyPrice: 2490,
    features: [
      "Tudo do Professional",
      "Multi-empresa",
      "API de integração",
      "Gestão de equipa avançada",
      "Relatórios executivos",
      "Gestor de conta dedicado",
      "SLA garantido",
    ],
    priceIdMonthly: "",
    priceIdYearly: "",
    icon: <Rocket className="h-5 w-5" />,
  },
];

export function PlanComparisonCard({
  currentTier,
  onSelectPlan,
  loading,
}: PlanComparisonCardProps) {
  const [isYearly, setIsYearly] = useState(false);

  const getButtonText = (planTier: string) => {
    if (currentTier === "founder") return "Parceiro Fundador";
    if (currentTier === planTier) return "Plano Atual";
    if (currentTier === "trial") return "Começar";
    
    const currentIndex = plans.findIndex((p) => p.tier === currentTier);
    const targetIndex = plans.findIndex((p) => p.tier === planTier);
    
    return targetIndex > currentIndex ? "Fazer Upgrade" : "Mudar Plano";
  };

  const isCurrentPlan = (planTier: string) => currentTier === planTier || currentTier === "founder";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Planos Disponíveis</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="billing-toggle" className="text-sm text-muted-foreground">
              Mensal
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <Label htmlFor="billing-toggle" className="text-sm text-muted-foreground">
              Anual
              <Badge variant="secondary" className="ml-2">
                -17%
              </Badge>
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`relative rounded-lg border p-6 ${
                plan.popular
                  ? "border-primary shadow-md"
                  : isCurrentPlan(plan.tier)
                  ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Mais Popular
                </Badge>
              )}
              {isCurrentPlan(plan.tier) && !plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600">
                  Seu Plano
                </Badge>
              )}

              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {plan.icon}
                </div>
                <h3 className="font-semibold text-lg">{plan.name}</h3>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {plan.description}
              </p>

              <div className="mb-4">
                <span className="text-3xl font-bold">
                  €{isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice}
                </span>
                <span className="text-muted-foreground">/mês</span>
                {isYearly && (
                  <p className="text-sm text-muted-foreground">
                    €{plan.yearlyPrice}/ano (faturado anualmente)
                  </p>
                )}
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                disabled={
                  loading || 
                  isCurrentPlan(plan.tier) || 
                  plan.tier === "enterprise" ||
                  (isYearly && !plan.priceIdYearly)
                }
                onClick={() => {
                  const priceId = isYearly ? plan.priceIdYearly : plan.priceIdMonthly;
                  if (priceId) {
                    onSelectPlan(priceId, plan.name);
                  }
                }}
              >
                {plan.tier === "enterprise" 
                  ? "Contactar Vendas" 
                  : (isYearly && !plan.priceIdYearly) 
                    ? "Apenas Mensal" 
                    : getButtonText(plan.tier)}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
