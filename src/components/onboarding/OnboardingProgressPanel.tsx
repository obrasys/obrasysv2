import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ChevronDown, ChevronUp, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingChecklistItem } from './OnboardingChecklistItem';
import { motion, AnimatePresence } from 'framer-motion';

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

function AnimatedProgress({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setDisplay(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative h-1.5 w-full rounded-full bg-primary/10 overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/70"
        initial={{ width: 0 }}
        animate={{ width: `${display}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

export function OnboardingProgressPanel({ steps, percentage, isMinActivation, onDismiss }: Props) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const completedCount = steps.filter((s) => s.completed).length;

  // ── Elegant completion state ──
  if (isMinActivation) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-r from-primary/[0.04] via-background to-background"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="relative flex items-center gap-4 px-5 py-3.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Operação ativa - está pronto para gerir a obra
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Continue a explorar orçamentos, equipa e controlo financeiro.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground h-7"
            onClick={onDismiss}
          >
            Fechar
          </Button>
        </div>
      </motion.div>
    );
  }

  // Only show up to 3 items total (completed items condensed, then pending)
  const completedSteps = steps.filter(s => s.completed);
  const pendingSteps = steps.filter(s => !s.completed);
  const visibleItems = [...completedSteps, ...pendingSteps].slice(0, 3);

  // Find the first pending step for the primary CTA
  const nextStep = pendingSteps[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-xl border border-primary/12 bg-gradient-to-br from-background via-background to-primary/[0.03]"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="px-5 py-3.5">
        {/* Compact header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-bold text-foreground truncate">
                  Configure a sua operação
                </h3>
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {Math.round(percentage)}%
                </span>
              </div>
              <div className="mt-1.5">
                <AnimatedProgress value={percentage} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {nextStep && (
              <Button
                size="sm"
                className="h-7 text-xs font-semibold gap-1 bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20"
                onClick={() => navigate(nextStep.route)}
              >
                {nextStep.ctaLabel}
                <ArrowRight className="w-3 h-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground/60 hover:text-foreground"
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground/40 hover:text-foreground"
              onClick={onDismiss}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Checklist - max 3 items */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-1.5">
                {visibleItems.map((step, i) => (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.25 }}
                  >
                    <OnboardingChecklistItem
                      icon={step.icon}
                      title={step.title}
                      benefit={step.benefit}
                      completed={step.completed}
                      ctaLabel={step.ctaLabel}
                      onAction={() => navigate(step.route)}
                    />
                  </motion.div>
                ))}
              </div>
              {pendingSteps.length > 3 && (
                <p className="text-[11px] text-muted-foreground/60 mt-2 text-center">
                  +{pendingSteps.length - 3} passos restantes
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
