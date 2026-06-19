import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPlanPrice, type PlanConfig } from "@/config/plans";

interface PricingCardProps {
  plan: PlanConfig;
  currentTier?: string;
  onSelect: (priceId: string, planName: string) => void;
  loading?: boolean;
}

export function PricingCard({ plan, currentTier, onSelect, loading }: PricingCardProps) {
  const isCurrentPlan = currentTier?.toLowerCase() === plan.key;
  const isHighlighted = !!plan.badge;

  return (
    <Card
      className={cn(
        "relative flex flex-col rounded-2xl",
        isHighlighted && "border-accent shadow-lg shadow-accent/20 lg:scale-[1.03]",
        isCurrentPlan && "border-primary",
      )}
    >
      {plan.badge && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
          {plan.badge}
        </Badge>
      )}

      {isCurrentPlan && (
        <Badge className="absolute -top-3 right-4 bg-primary">Plano Atual</Badge>
      )}

      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">{plan.name}</CardTitle>
        <CardDescription className="min-h-[3rem]">{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="text-center mb-6">
          <div className="text-4xl font-bold">
            {plan.price}€
            <span className="text-base font-normal text-muted-foreground"> {plan.vatLabel}</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">/ mês</div>
          <div className="sr-only">{formatPlanPrice(plan)}</div>
        </div>

        <ul className="space-y-3 mb-8 flex-1">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full"
          variant={isHighlighted ? "accent" : "default"}
          size="lg"
          disabled={loading || isCurrentPlan}
          onClick={() => onSelect(plan.stripePriceId, plan.name)}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isCurrentPlan ? (
            "Plano Atual"
          ) : (
            plan.ctaLabel
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
