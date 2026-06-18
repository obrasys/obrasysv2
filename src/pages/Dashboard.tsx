import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/hooks/useObras';
import { useRDOs } from '@/hooks/useRDOs';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { useTarefas } from '@/hooks/useTarefas';
import { useEngagement } from '@/hooks/useEngagement';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingWizard, OnboardingProgressPanel, OnboardingCompletionModal } from '@/components/onboarding';
import { EngagementBanner, EngagementBudgetModal, EngagementNotification, EngagementActiveBadge } from '@/components/engagement';
import { useEquipaMembros } from '@/hooks/useRecursos';
import {
  DashboardWelcome,
  DashboardKPIStrip,
  DashboardPriorities,
  DashboardObrasActive,
  DashboardFlowNav,
  DashboardAgendaPerformance,
  DashboardSetupProgress,
  DashboardGuidedActions,
} from '@/components/dashboard';
import { EmpresaModal } from '@/components/perfil/EmpresaModal';
import { DashboardAlertsWidget } from '@/components/axia/DashboardAlertsWidget';
import { VoiceCommandButton } from '@/components/axia/VoiceCommandButton';

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { obras, isLoading: loadingObras } = useObras();
  const { rdos, isLoading: loadingRDOs } = useRDOs();
  const { orcamentos } = useOrcamentos();
  const { tarefas } = useTarefas();
  const { membros: equipaMembros } = useEquipaMembros();
  const { activeState, dismissMessage } = useEngagement();
  const {
    progress: onboardingProgress,
    showWizard,
    showProgressPanel,
    showSuccessState,
    showCompletionModal,
    setShowCompletionModal,
    percentage: onboardingPercentage,
    orderedSteps,
    updateWizardStep,
    completeWizard,
    skipWizard,
    dismissPanel,
  } = useOnboarding();
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showEmpresaModal, setShowEmpresaModal] = useState(false);
  const [empresaPromptDismissed, setEmpresaPromptDismissed] = useState(false);

  useEffect(() => {
    if (activeState === 'B') setShowBudgetModal(true);
  }, [activeState]);

  const companyIncomplete = profile && !profile.empresa_morada && !profile.empresa_cidade;
  const showCompanyPrompt = !showWizard && !empresaPromptDismissed && companyIncomplete && (
    onboardingProgress?.wizard_status === 'completed' || onboardingProgress?.wizard_status === 'skipped'
  );

  // Computed KPIs
  const kpis = useMemo(() => {
    const obrasAtivas = obras?.filter(o => o.status === 'em_curso').length || 0;
    const obrasPausadas = obras?.filter(o => o.status === 'pausada').length || 0;
    const obrasSemProgresso = obras?.filter(o => o.status === 'em_curso' && (o.progresso || 0) === 0).length || 0;
    const obrasEmRisco = obrasPausadas + obrasSemProgresso;
    const rdosPendentes = rdos?.filter((r: any) => r.status === 'rascunho' || r.status === 'pendente').length || 0;
    const tarefasPendentes = tarefas?.filter((t: any) => t.status === 'pendente' || t.status === 'em_progresso').length || 0;
    // Placeholder for financial - real hook can be added later
    const receberSemana = 0;
    const medicoesPendentes = 0;

    return { obrasAtivas, obrasEmRisco, receberSemana, medicoesPendentes, rdosPendentes, tarefasPendentes };
  }, [obras, rdos, tarefas]);

  const isLoading = loadingObras || loadingRDOs;
  const hasData = (obras?.length || 0) > 0 || (rdos?.length || 0) > 0;

  if (isLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="p-4 md:p-6 space-y-6">
        {/* Onboarding Wizard */}
        {showWizard && onboardingProgress && (
          <OnboardingWizard
            initialStep={onboardingProgress.wizard_current_step || 0}
            initialGoal={onboardingProgress.selected_goal}
            initialRole={onboardingProgress.selected_role}
            onUpdateStep={updateWizardStep}
            onComplete={completeWizard}
            onSkip={skipWizard}
          />
        )}

        {!showWizard && (
          <>
            {/* Engagement */}
            {activeState === 'A' && <EngagementBanner onDismiss={dismissMessage} />}
            <EngagementBudgetModal open={showBudgetModal} onClose={() => { setShowBudgetModal(false); dismissMessage(); }} />
            {activeState === 'C' && <EngagementNotification onDismiss={dismissMessage} />}

            {/* Onboarding progress */}
            {(showProgressPanel || showSuccessState) && (
              <OnboardingProgressPanel
                steps={orderedSteps}
                percentage={onboardingPercentage}
                isMinActivation={!!showSuccessState}
                onDismiss={dismissPanel}
              />
            )}

            {/* Company prompt */}
            {showCompanyPrompt && (
              <Card className="border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700/30">
                <CardContent className="py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Complete os dados da sua empresa</h3>
                      <p className="text-xs text-muted-foreground">Preencha morada, contactos e logotipo para usar nos seus orçamentos e documentos.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEmpresaPromptDismissed(true)}>Mais tarde</Button>
                    <Button size="sm" onClick={() => setShowEmpresaModal(true)}>
                      <Building2 className="w-4 h-4 mr-1" /> Completar agora
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <EmpresaModal open={showEmpresaModal} onOpenChange={(open) => { setShowEmpresaModal(open); if (!open) setEmpresaPromptDismissed(true); }} />
            <OnboardingCompletionModal open={showCompletionModal} onClose={() => setShowCompletionModal(false)} />


            {/* === NEW DASHBOARD STRUCTURE === */}

            {/* 1. Welcome + Quick Actions */}
            <DashboardWelcome
              obrasEmRisco={kpis.obrasEmRisco}
              acoesPrioritarias={kpis.tarefasPendentes}
              medicoesPendentes={kpis.medicoesPendentes}
            />

            {/* 1.2. Guided Actions (Fase 6 — Orçamentação Inteligente) */}
            <DashboardGuidedActions />

            {/* 1.5. Setup Progress */}
            <DashboardSetupProgress
              hasLogo={!!profile?.empresa_logo_url}
              hasAddress={!!(profile?.empresa_morada && profile?.empresa_cidade)}
              hasObra={(obras?.length || 0) > 0}
              hasOrcamento={(orcamentos?.length || 0) > 0}
              hasRDO={(rdos?.length || 0) > 0}
              hasEquipa={(equipaMembros?.length || 0) > 0}
            />

            {/* 2. KPI Executive Strip */}
            <DashboardKPIStrip
              pipelineValue={orcamentos?.reduce((sum: number, o: any) => sum + (o.valor_total || 0), 0) || 0}
              rfqsCount={orcamentos?.filter((o: any) => o.status === 'em_curso' || o.status === 'pendente').length || 0}
              confiancaMedia={91.4}
              cicloMedio={6.8}
            />

            {/* 3. Priorities + Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <DashboardPriorities
                  obras={obras || []}
                  tarefasPendentes={kpis.tarefasPendentes}
                  rdosPendentes={kpis.rdosPendentes}
                  medicoesPendentes={kpis.medicoesPendentes}
                />
              </div>
              <DashboardAlertsWidget />
            </div>

            {/* 4. Active Works - hero section */}
            <DashboardObrasActive obras={obras || []} />

            {/* 5. Flow Navigation */}
            <DashboardFlowNav />

            {/* 6. Agenda + Performance */}
            <DashboardAgendaPerformance
              obras={obras || []}
              tarefasPendentes={kpis.tarefasPendentes}
            />
          </>
        )}
      </div>
      <div className="fixed bottom-6 right-6 z-40">
        <VoiceCommandButton sourceContext="global" />
      </div>
    </AppLayout>
  );
};

export default Dashboard;
