import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PartyPopper, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { OnboardingChecklistItem } from './OnboardingChecklistItem';

export interface ChecklistStep {
  key: string;
  icon: React.ReactNode;
  title: string;
  benefit: string;
  ctaLabel: string;
  route: string;
  completed: boolean;
  weight: number;
}

interface Props {
  steps: ChecklistStep[];
  percentage: number;
  isMinActivation: boolean;
  onDismiss: () => void;
}

export function OnboardingProgressPanel({ steps, percentage, isMinActivation, onDismiss }: Props) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const completedCount = steps.filter((s) => s.completed).length;

  // Success state
  if (isMinActivation) {
    return (
      <Card className="border-green-200/60 bg-gradient-to-r from-green-50/80 via-background to-background dark:from-green-950/20 dark:border-green-800/30">
        <CardContent className="py-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
            <PartyPopper className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-display text-base font-bold text-foreground">
              A sua operação já está em marcha no Obra Sys
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Agora pode aprofundar orçamento, execução e controlo à medida que a obra evolui.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onDismiss}>
            Ver dashboard completo
          </Button>
        </CardContent>
      </Card>
    );
  }

  const pendingSteps = steps.filter((s) => !s.completed);
  const visiblePending = pendingSteps.slice(0, 3);

  return (
    <Card className="border-primary/15 bg-gradient-to-br from-background via-background to-primary/[0.03] shadow-sm">
      <CardContent className="py-5 px-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-display text-base md:text-lg font-bold text-foreground">
              Está a poucos passos de ter a obra sob controlo
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Centralize o essencial agora e evolua à medida que a sua operação cresce.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{completedCount} de {steps.length} passos concluídos</span>
            <span className="font-semibold text-primary">{Math.round(percentage)}%</span>
          </div>
          <Progress value={percentage} className="h-2.5" />
        </div>

        {/* Checklist items */}
        {!collapsed && (
          <div className="mt-5 space-y-2.5">
            {/* Show completed first, then pending */}
            {steps.filter(s => s.completed).map((step) => (
              <OnboardingChecklistItem
                key={step.key}
                icon={step.icon}
                title={step.title}
                benefit={step.benefit}
                completed={true}
                ctaLabel={step.ctaLabel}
                onAction={() => navigate(step.route)}
              />
            ))}
            {visiblePending.map((step) => (
              <OnboardingChecklistItem
                key={step.key}
                icon={step.icon}
                title={step.title}
                benefit={step.benefit}
                completed={false}
                ctaLabel={step.ctaLabel}
                onAction={() => navigate(step.route)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
