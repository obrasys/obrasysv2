import { 
  FileText, 
  Users, 
  Calendar, 
  BarChart3, 
  Shield, 
  Wallet,
  ClipboardList,
  Building
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: FileText,
      title: "Orçamentação Inteligente",
      description: "Crie orçamentos profissionais com base de preços personalizada, validação por IA e geração automática de PDF.",
    },
    {
      icon: Building,
      title: "Gestão de Obras",
      description: "Acompanhe todas as suas obras num só lugar. Dashboard completo com KPIs, progresso e alertas em tempo real.",
    },
    {
      icon: ClipboardList,
      title: "Relatórios Diários (RDO)",
      description: "Registe trabalhos executados, ocorrências e calcule progresso automaticamente. Histórico completo por obra.",
    },
    {
      icon: Calendar,
      title: "Cronograma & Tarefas",
      description: "Kanban board e Gantt chart integrados. Gerencie dependências, prazos e atribua responsáveis facilmente.",
    },
    {
      icon: Wallet,
      title: "Controlo Financeiro",
      description: "Contas a pagar e receber, acompanhamento de faturação e gestão de custos por obra e fornecedor.",
    },
    {
      icon: Users,
      title: "Gestão de Equipas",
      description: "Convide colaboradores, defina permissões e gerencie acessos. Diferentes níveis para gestores, fiscais e clientes.",
    },
    {
      icon: Shield,
      title: "Conformidade Legal",
      description: "Livro de obra digital, checklists de conformidade e workflow de aprovações com histórico completo.",
    },
    {
      icon: BarChart3,
      title: "Relatórios & Analytics",
      description: "Relatórios personalizados de progresso, financeiro e qualidade. Exportação em PDF com um clique.",
    },
  ];

  return (
    <section id="features" className="py-24 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl -z-10" />

      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
            Funcionalidades
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-6">
            Tudo o que precisa para{" "}
            <span className="text-gradient">gerir obras</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Uma plataforma completa desenhada especificamente para a construção civil portuguesa. 
            Da orçamentação à entrega final.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-card rounded-2xl p-6 shadow-card border border-border hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>

              {/* Content */}
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover accent line */}
              <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-accent scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-full" />
            </div>
          ))}
        </div>

        {/* Additional highlight */}
        <div className="mt-16 bg-primary rounded-3xl p-8 md:p-12 relative overflow-hidden">
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
          
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
                Potenciado por Inteligência Artificial
              </h3>
              <p className="text-primary-foreground/70 mb-6">
                Validação automática de orçamentos, geração de descrições técnicas, 
                cálculo de progresso e suporte via chat — tudo com IA integrada.
              </p>
              <div className="flex flex-wrap gap-3">
                {["Validação de Orçamentos", "Descrições Técnicas", "Cálculo de Progresso", "Suporte 24/7"].map((item, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground text-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-48 h-48 rounded-full bg-accent/20 flex items-center justify-center animate-float">
                <div className="w-32 h-32 rounded-full bg-accent/30 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-accent-foreground" />
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

export default Features;
