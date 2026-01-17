const FAQ = () => {
  const faqs = [
    {
      question: "Posso cancelar a qualquer momento?",
      answer:
        "Sim, pode cancelar a sua subscrição a qualquer momento sem penalizações. Os seus dados ficam seguros durante 90 dias após o cancelamento.",
    },
    {
      question: "Que métodos de pagamento aceitam?",
      answer:
        "Aceitamos cartões de crédito/débito, transferência bancária e MB WAY. Também oferecemos faturação anual com desconto.",
    },
    {
      question: "Há custos de implementação?",
      answer:
        "Não, a implementação é gratuita. Fornecemos treino da equipa e migração de dados sem custos adicionais.",
    },
    {
      question: "Posso fazer upgrade/downgrade?",
      answer:
        "Claro! Pode alterar o seu plano a qualquer momento. As alterações são aplicadas no próximo ciclo de faturação.",
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Perguntas Frequentes sobre Preços
          </h2>
        </div>

        {/* FAQ Grid */}
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-10 max-w-5xl mx-auto">
          {faqs.map((faq, index) => (
            <div key={index}>
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">
                {faq.question}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
