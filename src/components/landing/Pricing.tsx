import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      price: "49",
      description: "Ideal para pequenas empresas e empreiteiros individuais.",
      features: [
        "Até 3 obras ativas",
        "1 utilizador",
        "Orçamentação básica",
        "Relatórios diários (RDO)",
        "Gestão de tarefas",
        "Suporte por email",
      ],
      cta: "Começar Trial Grátis",
      highlighted: false,
    },
    {
      name: "Professional",
      price: "99",
      description: "Para empresas em crescimento com múltiplas obras.",
      features: [
        "Obras ilimitadas",
        "Até 10 utilizadores",
        "Orçamentação avançada com IA",
        "Livro de obra digital",
        "Controlo financeiro completo",
        "Gestão de equipas",
        "Relatórios personalizados",
        "Suporte prioritário",
      ],
      cta: "Começar Trial Grátis",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Personalizado",
      description: "Soluções à medida para grandes construtoras.",
      features: [
        "Tudo do Professional",
        "Utilizadores ilimitados",
        "API dedicada",
        "Integrações personalizadas",
        "Formação da equipa",
        "Gestor de conta dedicado",
        "SLA garantido",
        "Suporte 24/7",
      ],
      cta: "Falar com Vendas",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-muted/30 relative">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
            Preços
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-6">
            Planos que{" "}
            <span className="text-gradient">escalam consigo</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Escolha o plano ideal para o seu negócio. Todos incluem 30 dias de trial grátis.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-3xl p-8 transition-all duration-300 ${
                plan.highlighted
                  ? "bg-primary text-primary-foreground scale-105 shadow-hero"
                  : "bg-card text-card-foreground border border-border shadow-card hover:shadow-card-hover"
              }`}
            >
              {/* Popular badge */}
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-semibold">
                    <Star className="w-4 h-4 fill-current" />
                    Mais Popular
                  </div>
                </div>
              )}

              {/* Plan name */}
              <h3 className="font-display text-xl font-bold mb-2">{plan.name}</h3>
              
              {/* Price */}
              <div className="mb-4">
                {plan.price === "Personalizado" ? (
                  <span className="font-display text-3xl font-bold">{plan.price}</span>
                ) : (
                  <>
                    <span className="font-display text-5xl font-bold">€{plan.price}</span>
                    <span className={plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}>/mês</span>
                  </>
                )}
              </div>

              {/* Description */}
              <p className={`text-sm mb-6 ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {plan.description}
              </p>

              {/* CTA */}
              <Button
                variant={plan.highlighted ? "hero" : "accent"}
                className="w-full mb-8"
                size="lg"
              >
                {plan.cta}
              </Button>

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 shrink-0 mt-0.5 ${plan.highlighted ? "text-accent" : "text-accent"}`} />
                    <span className={`text-sm ${plan.highlighted ? "text-primary-foreground/90" : "text-foreground"}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ teaser */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground">
            Tem dúvidas sobre os planos?{" "}
            <a href="#contact" className="text-accent hover:underline font-medium">
              Fale connosco
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
