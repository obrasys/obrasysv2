import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Building2, Rocket } from "lucide-react";
import { PLAN_ORDER, PLANS, type PlanKey } from "@/config/plans";

interface PlanComparisonCardProps {
  currentTier: string;
  onSelectPlan: (priceId: string, planName: string) => Promise<void>;
  loading: boolean;
}

const PLAN_ICONS: Record<PlanKey, React.ReactNode> = {
  starter: <Zap className="h-5 w-5" />,
  professional: <Building2 className="h-5 w-5" />,
  promotor: <Rocket className="h-5 w-5" />,
};

export function PlanComparisonCard({
  currentTier,
  onSelectPlan,
  loading,
}: PlanComparisonCardProps) {
  const getButtonText = (planKey: PlanKey) => {
    if (currentTier === "founder") return "Parceiro Fundador";
    if (currentTier === planKey) return "Plano Atual";
    if (currentTier === "trial") return PLANS[planKey].ctaLabel;

    const currentIndex = PLAN_ORDER.indexOf(currentTier as PlanKey);
    const targetIndex = PLAN_ORDER.indexOf(planKey);

    if (currentIndex < 0) return PLANS[planKey].ctaLabel;
    return targetIndex > currentIndex ? "Fazer Upgrade" : "Mudar Plano";
  };

  const isCurrentPlan = (planKey: PlanKey) =>
    currentTier === planKey || currentTier === "founder";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planos Disponíveis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {PLAN_ORDER.map((key) => {
            const plan = PLANS[key];
            const highlighted = !!plan.badge;
            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  highlighted
                    ? "border-primary shadow-md"
                    : isCurrentPlan(plan.key)
                    ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
                    : "border-border"
                }`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    {plan.badge}
                  </Badge>
                )}
                {isCurrentPlan(plan.key) && !plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600">
                    Seu Plano
                  </Badge>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {PLAN_ICONS[plan.key]}
                  </div>
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                </div>

                <p className="text-sm text-muted-foreground mb-4 min-h-[3rem]">
                  {plan.description}
                </p>

                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}€</span>
                  <span className="text-muted-foreground"> {plan.vatLabel} / mês</span>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full mt-auto"
                  variant={highlighted ? "default" : "outline"}
                  disabled={loading || isCurrentPlan(plan.key)}
                  onClick={() => onSelectPlan(plan.stripePriceId, plan.name)}
                >
                  {getButtonText(plan.key)}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
