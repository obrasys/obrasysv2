import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout';
import { EssencialWizardProgress } from '@/components/orcamentos/essencial/EssencialWizardProgress';
import { EssencialStep1Cliente } from '@/components/orcamentos/essencial/EssencialStep1Cliente';
import { EssencialStep2Trabalhos } from '@/components/orcamentos/essencial/EssencialStep2Trabalhos';
import { EssencialStep3LucroEnvio } from '@/components/orcamentos/essencial/EssencialStep3LucroEnvio';
import { AxiaSuggestionsPanel } from '@/components/orcamentos/essencial/AxiaSuggestionsPanel';
import { useOrcamentoEssencial } from '@/hooks/useOrcamentoEssencial';
import { useAxiaEssencial, AxiaSuggestion } from '@/hooks/useAxiaEssencial';
import { AnimatePresence, motion } from 'framer-motion';

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

  const {
    suggestions,
    loading: axiaLoading,
    fetchSuggestions,
    acceptSuggestion,
    dismissSuggestion,
    clearSuggestions,
    trackAxiaEvent,
  } = useAxiaEssencial();

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

  // Fetch Axia suggestions when entering step 2 or 3
  useEffect(() => {
    if (currentStep === 2 && step1.tipo_obra && items.length >= 0) {
      clearSuggestions();
      const timer = setTimeout(() => {
        fetchSuggestions(2, step1.tipo_obra, items);
      }, 500);
      return () => clearTimeout(timer);
    }
    if (currentStep === 3) {
      clearSuggestions();
      const timer = setTimeout(() => {
        fetchSuggestions(3, step1.tipo_obra, items, margemLucro);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Handle accept of Axia suggestions
  const handleAcceptSuggestion = useCallback((suggestion: AxiaSuggestion) => {
    acceptSuggestion(suggestion);

    if (suggestion.type === 'add_item' && suggestion.payload.canonical_label) {
      setItems(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          descricao: suggestion.payload.canonical_label,
          valor: suggestion.payload.suggested_value || 0,
        },
      ]);
    }

    if (suggestion.type === 'adjust_profit' && suggestion.payload.suggested_margin != null) {
      setMargemLucro(suggestion.payload.suggested_margin);
    }
  }, [acceptSuggestion, setItems, setMargemLucro]);

  const stepVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    <AppLayout
      title="Orçamento Essencial"
      subtitle="Crie um orçamento profissional em menos de 5 minutos"
    >
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Progress */}
        <EssencialWizardProgress currentStep={currentStep} />

        {/* Steps with animation */}
        <div className="pt-2 min-h-[400px]">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <EssencialStep1Cliente
                  data={step1}
                  onChange={setStep1}
                  onNext={handleStep1Next}
                  isLoading={isLoading}
                />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-4">
                  <EssencialStep2Trabalhos
                    items={items}
                    onChange={setItems}
                    margemLucro={margemLucro}
                    templates={templates}
                    isLoadingTemplates={isLoadingTemplates}
                    onNext={handleStep2Next}
                    onBack={() => setCurrentStep(1)}
                  />
                  <div className="lg:ml-0 lg:max-w-[66%]">
                    <AxiaSuggestionsPanel
                      suggestions={suggestions}
                      loading={axiaLoading}
                      onAccept={handleAcceptSuggestion}
                      onDismiss={dismissSuggestion}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-4">
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
                  <div className="max-w-lg mx-auto">
                    <AxiaSuggestionsPanel
                      suggestions={suggestions}
                      loading={axiaLoading}
                      onAccept={handleAcceptSuggestion}
                      onDismiss={dismissSuggestion}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}
