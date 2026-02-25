import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { EssencialWizardProgress } from '@/components/orcamentos/essencial/EssencialWizardProgress';
import { EssencialStep1Cliente } from '@/components/orcamentos/essencial/EssencialStep1Cliente';
import { EssencialStep2Trabalhos } from '@/components/orcamentos/essencial/EssencialStep2Trabalhos';
import { EssencialStep3LucroEnvio } from '@/components/orcamentos/essencial/EssencialStep3LucroEnvio';
import { useOrcamentoEssencial } from '@/hooks/useOrcamentoEssencial';

export default function EssencialPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [incluirIva, setIncluirIva] = useState(true);
  const [enviarEmail, setEnviarEmail] = useState(false);

  const {
    step1, setStep1,
    items, setItems,
    margemLucro, setMargemLucro,
    templates, isLoadingTemplates,
    isLoading,
    completeStep1,
    completeStep2,
    finalize,
  } = useOrcamentoEssencial();

  const subtotal = items.reduce((s, i) => s + (i.valor || 0), 0);

  const handleStep1Next = async () => {
    await completeStep1();
    setCurrentStep(2);
  };

  const handleStep2Next = async () => {
    await completeStep2();
    setCurrentStep(3);
  };

  const handleFinalize = () => {
    finalize(incluirIva);
  };

  return (
    <AppLayout
      title="Orçamento Essencial"
      subtitle="Crie um orçamento profissional em menos de 5 minutos"
    >
      <div className="p-4 md:p-6 space-y-8 max-w-5xl mx-auto">
        {/* Microcopy */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            ✨ Crie um orçamento profissional em menos de 5 minutos.
          </p>
        </div>

        {/* Progress */}
        <EssencialWizardProgress currentStep={currentStep} />

        {/* Steps */}
        <div className="pt-4">
          {currentStep === 1 && (
            <EssencialStep1Cliente
              data={step1}
              onChange={setStep1}
              onNext={handleStep1Next}
              isLoading={isLoading}
            />
          )}

          {currentStep === 2 && (
            <EssencialStep2Trabalhos
              items={items}
              onChange={setItems}
              margemLucro={margemLucro}
              templates={templates}
              isLoadingTemplates={isLoadingTemplates}
              onNext={handleStep2Next}
              onBack={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 3 && (
            <EssencialStep3LucroEnvio
              subtotal={subtotal}
              margemLucro={margemLucro}
              onMargemChange={setMargemLucro}
              incluirIva={incluirIva}
              onIncluirIvaChange={setIncluirIva}
              enviarEmail={enviarEmail}
              onEnviarEmailChange={setEnviarEmail}
              onBack={() => setCurrentStep(2)}
              onFinalize={handleFinalize}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
