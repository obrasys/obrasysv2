import { Button } from "@/components/ui/button";
import { ArrowRight, Play, CheckCircle2 } from "lucide-react";

const Hero = () => {
  const highlights = [
    "30 dias grátis",
    "Sem cartão de crédito",
    "Suporte em português",
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-hero-gradient" />
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-2xl" />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent-foreground mb-8 animate-fade-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="text-sm font-medium">A plataforma #1 em gestão de obras em Portugal</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-7xl font-bold text-primary-foreground mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            Gestão de Obras{" "}
            <span className="relative">
              <span className="text-gradient">Simplificada</span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path d="M2 10C50 2 150 2 298 10" stroke="hsl(32 95% 44%)" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-primary-foreground/70 mb-8 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.2s" }}>
            Controle orçamentos, equipas, prazos e documentação numa única plataforma. 
            Aumente a produtividade e reduza custos nas suas obras.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <Button variant="hero" size="xl">
              Começar Agora — É Grátis
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="heroOutline" size="xl">
              <Play className="w-5 h-5" />
              Ver Demonstração
            </Button>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-primary-foreground/60 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            {highlights.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-16 max-w-5xl mx-auto animate-fade-up" style={{ animationDelay: "0.5s" }}>
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-accent/20 blur-3xl rounded-3xl" />
            
            {/* Dashboard mockup */}
            <div className="relative bg-card rounded-2xl shadow-hero border border-border/50 overflow-hidden">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-accent/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-background rounded-lg px-4 py-1.5 text-sm text-muted-foreground max-w-md mx-auto">
                    app.obrasys.pt/dashboard
                  </div>
                </div>
              </div>
              
              {/* Dashboard content placeholder */}
              <div className="p-6 bg-gradient-to-b from-muted/30 to-background min-h-[300px] md:min-h-[400px]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Obras Ativas", value: "12" },
                    { label: "Orçamentos", value: "€2.4M" },
                    { label: "Tarefas", value: "148" },
                    { label: "Progresso", value: "67%" },
                  ].map((stat, i) => (
                    <div key={i} className="bg-card rounded-xl p-4 shadow-card border border-border">
                      <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold font-display text-foreground">{stat.value}</p>
                    </div>
                  ))}
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 bg-card rounded-xl p-4 shadow-card border border-border h-48">
                    <p className="text-sm font-medium text-foreground mb-3">Progresso das Obras</p>
                    <div className="space-y-3">
                      {[
                        { name: "Edifício Miraflores", progress: 85 },
                        { name: "Residencial Tejo", progress: 62 },
                        { name: "Centro Comercial Norte", progress: 34 },
                      ].map((obra, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{obra.name}</span>
                            <span className="text-foreground font-medium">{obra.progress}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-accent rounded-full transition-all duration-1000"
                              style={{ width: `${obra.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-card rounded-xl p-4 shadow-card border border-border h-48">
                    <p className="text-sm font-medium text-foreground mb-3">Atividade Recente</p>
                    <div className="space-y-3">
                      {[
                        { action: "RDO criado", time: "Há 5 min" },
                        { action: "Orçamento aprovado", time: "Há 1 hora" },
                        { action: "Nova tarefa", time: "Há 2 horas" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-accent" />
                          <span className="text-muted-foreground flex-1">{item.action}</span>
                          <span className="text-muted-foreground/60">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
