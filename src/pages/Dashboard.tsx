import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  ClipboardList,
  FileText,
  ListChecks,
  Plus,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/hooks/useObras';
import { useRDOs } from '@/hooks/useRDOs';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { useTarefas } from '@/hooks/useTarefas';
import { useEquipaMembros } from '@/hooks/useRecursos';
import { useEngagement } from '@/hooks/useEngagement';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useNotifications } from '@/hooks/useNotifications';
import { OnboardingWelcomeModal, OnboardingChecklist, OnboardingCompletionModal, OnboardingInactiveReminder } from '@/components/onboarding';
import { EngagementBanner, EngagementBudgetModal, EngagementNotification, EngagementActiveBadge } from '@/components/engagement';
import { DashboardCharts, DashboardMetrics, DashboardStats, ObrasSummaryTable } from '@/components/dashboard';

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { obras, isLoading: loadingObras } = useObras();
  const { rdos, isLoading: loadingRDOs } = useRDOs();
  const { orcamentos, isLoading: loadingOrcamentos } = useOrcamentos();
  const { tarefas, isLoadingTarefas } = useTarefas();
  const { membros, loading: loadingMembros } = useEquipaMembros();
  const { activeState, dismissMessage } = useEngagement();
  const { notifications: userNotifications, markAsRead: markNotifRead } = useNotifications();
  const {
    progress: onboardingProgress, showWelcomeModal, showChecklist,
    showCompletionModal, setShowCompletionModal, showInactiveReminder,
    dismissWelcome, dismissOnboarding, percentage: onboardingPercentage,
  } = useOnboarding();
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  useEffect(() => {
    if (activeState === 'B') setShowBudgetModal(true);
  }, [activeState]);

  // KPI counts
  const kpis = useMemo(() => ({
    totalObras: obras?.length || 0,
    totalRDOs: rdos?.length || 0,
    totalOrcamentos: orcamentos?.length || 0,
    totalTarefas: tarefas?.length || 0,
  }), [obras, rdos, orcamentos, tarefas]);

  const isLoading = loadingObras || loadingRDOs;

  if (isLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const hasData = kpis.totalObras > 0 || kpis.totalRDOs > 0;

  const kpiCards = [
    { label: 'Obras', value: kpis.totalObras, icon: Building2, bg: 'bg-primary/10', color: 'text-primary' },
    { label: 'RDOs', value: kpis.totalRDOs, icon: ClipboardList, bg: 'bg-emerald-100', color: 'text-emerald-600' },
    { label: 'Orçamentos', value: kpis.totalOrcamentos, icon: FileText, bg: 'bg-amber-100', color: 'text-amber-600' },
    { label: 'Tarefas', value: kpis.totalTarefas, icon: ListChecks, bg: 'bg-purple-100', color: 'text-purple-600' },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">
                Olá, {profile?.nome?.split(' ')[0] || 'Utilizador'}! 👋
              </h2>
              <p className="text-sm text-muted-foreground">
                {hasData
                  ? 'Aqui está o resumo do acompanhamento das suas obras.'
                  : 'Bem-vindo ao ObraSys. Comece criando a sua primeira obra.'}
              </p>
            </div>
            {activeState === 'D' && <EngagementActiveBadge />}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/rdos/criar')}>
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Novo </span>RDO
            </Button>
            <Button size="sm" onClick={() => navigate('/obras/criar')}>
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Nova </span>Obra
            </Button>
          </div>
        </div>

        {/* Engagement & Onboarding (kept) */}
        {activeState === 'A' && <EngagementBanner onDismiss={dismissMessage} />}
        <EngagementBudgetModal open={showBudgetModal} onClose={() => { setShowBudgetModal(false); dismissMessage(); }} />
        {activeState === 'C' && <EngagementNotification onDismiss={dismissMessage} />}
        <OnboardingWelcomeModal open={showWelcomeModal} onStart={() => dismissWelcome(false)} onExplore={() => dismissWelcome(true)} />
        <OnboardingCompletionModal open={showCompletionModal} onClose={() => setShowCompletionModal(false)} />
        {showChecklist && onboardingProgress && (
          <OnboardingChecklist
            step1={onboardingProgress.step_1_completed}
            step2={onboardingProgress.step_2_completed}
            step3={onboardingProgress.step_3_completed}
            step4={onboardingProgress.step_4_completed}
            percentage={onboardingPercentage}
            onDismiss={dismissOnboarding}
          />
        )}
        {showInactiveReminder && <OnboardingInactiveReminder onDismiss={dismissOnboarding} />}

        {/* Quick Action - Orçamento Essencial */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-base">Criar Orçamento em 3 Passos</h3>
              <p className="text-xs text-muted-foreground">Demora menos de 5 minutos</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => navigate('/orcamentos/essencial/novo')}>
                <Sparkles className="w-4 h-4 mr-1" /> Criar Agora
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/orcamentos/criar')}>
                Avançado
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section 1: KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCards.map((kpi) => (
            <Card key={kpi.label} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{kpi.value.toLocaleString('pt-PT')}</p>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {hasData ? (
          <>
            {/* Section 2: Charts */}
            <DashboardCharts rdos={rdos || []} obras={obras || []} />

            {/* Section 3: Metrics with sparklines */}
            <DashboardMetrics obras={obras || []} rdos={rdos || []} orcamentos={orcamentos || []} />

            {/* Section 4: Stats (progress, donut, team) */}
            <DashboardStats obras={obras || []} tarefas={tarefas || []} membros={membros || []} />

            {/* Section 5: Summary Table */}
            <ObrasSummaryTable obras={obras || []} />
          </>
        ) : (
          <Card className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-accent" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground mb-2">
              Comece a sua primeira obra
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Crie a sua primeira obra para começar a gerir orçamentos, relatórios diários e acompanhar o progresso.
            </p>
            <Button onClick={() => navigate('/obras/criar')} size="lg">
              <Plus className="w-4 h-4 mr-2" /> Criar Obra
            </Button>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
