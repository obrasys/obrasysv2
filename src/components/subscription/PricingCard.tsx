import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  stripePriceId?: string;
  isPopular?: boolean;
  isEnterprise?: boolean;
  billingPeriod: "monthly" | "yearly";
  currentTier?: string;
  onSelect: (priceId: string, planName: string) => void;
  loading?: boolean;
}

export function PricingCard({
  name,
  description,
  priceMonthly,
  priceYearly,
  features,
  stripePriceId,
  isPopular,
  isEnterprise,
  billingPeriod,
  currentTier,
  onSelect,
  loading,
}: PricingCardProps) {
  const price = billingPeriod === "monthly" ? priceMonthly : priceYearly;
  const isCurrentPlan = currentTier?.toLowerCase() === name.toLowerCase();
  const monthlyEquivalent = billingPeriod === "yearly" ? Math.round(priceYearly / 12) : priceMonthly;
  const savings = billingPeriod === "yearly" ? Math.round(((priceMonthly * 12) - priceYearly) / (priceMonthly * 12) * 100) : 0;

  return (
    <Card className={cn(
      "relative flex flex-col",
      isPopular && "border-accent shadow-lg shadow-accent/20 scale-105",
      isCurrentPlan && "border-primary"
    )}>
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
          Mais Popular
        </Badge>
      )}
      
      {isCurrentPlan && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
          Plano Atual
        </Badge>
      )}

      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="text-center mb-6">
          {isEnterprise ? (
            <div className="text-4xl font-bold">Personalizado</div>
          ) : (
            <>
              <div className="text-4xl font-bold">
                €{monthlyEquivalent}
                <span className="text-lg font-normal text-muted-foreground">/mês</span>
              </div>
              {billingPeriod === "yearly" && (
                <div className="text-sm text-muted-foreground mt-1">
                  €{price}/ano · Poupa {savings}%
                </div>
              )}
            </>
          )}
        </div>

        <ul className="space-y-3 mb-8 flex-1">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full"
          variant={isPopular ? "accent" : "default"}
          size="lg"
          disabled={loading || isCurrentPlan}
          onClick={() => {
            if (isEnterprise) {
              window.open("mailto:contacto@obrasys.pt?subject=Enterprise%20Plan", "_blank");
            } else if (stripePriceId) {
              onSelect(stripePriceId, name);
            }
          }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isCurrentPlan ? (
            "Plano Atual"
          ) : isEnterprise ? (
            "Contactar Vendas"
          ) : (
            "Começar Agora"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
