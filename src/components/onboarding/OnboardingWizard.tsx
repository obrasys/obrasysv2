import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { OnboardingStepWelcome } from './OnboardingStepWelcome';
import { OnboardingStepGoal, type GoalOption } from './OnboardingStepGoal';
import { OnboardingStepRole, type RoleOption } from './OnboardingStepRole';
import { OnboardingStepCreateProject } from './OnboardingStepCreateProject';

interface Props {
  initialStep: number;
  initialGoal?: string | null;
  initialRole?: string | null;
  onUpdateStep: (step: number, data?: Record<string, string>) => void;
  onComplete: () => void;
  onSkip: () => void;
}

const TOTAL_STEPS = 4;
const stepLabels = ['Início', 'Objetivo', 'Perfil', 'Primeira obra'];

export function OnboardingWizard({
  initialStep,
  initialGoal,
  initialRole,
  onUpdateStep,
  onComplete,
  onSkip,
}: Props) {
  const [step, setStep] = useState(Math.max(0, Math.min(initialStep, 3)));
  const [direction, setDirection] = useState(1);

  const goTo = useCallback(
    (s: number, data?: Record<string, string>) => {
      setDirection(s > step ? 1 : -1);
      setStep(s);
      onUpdateStep(s, data);
    },
    [onUpdateStep, step],
  );

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-2xl mx-auto overflow-hidden">
        {/* Premium container with glow */}
        <div className="relative rounded-2xl border border-border/50 bg-card shadow-2xl shadow-primary/[0.04]">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {/* Stepper — hidden on welcome */}
          {step > 0 && (
            <div className="px-6 pt-6 pb-2">
              <div className="flex items-center justify-center gap-1">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                          i < step
                            ? 'bg-primary text-primary-foreground scale-90'
                            : i === step
                              ? 'bg-primary text-primary-foreground ring-[3px] ring-primary/15 scale-100'
                              : 'bg-muted/60 text-muted-foreground/50 scale-90'
                        }`}
                      >
                        {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <span className={`text-[10px] font-medium transition-colors ${
                        i <= step ? 'text-foreground/70' : 'text-muted-foreground/40'
                      }`}>
                        {stepLabels[i]}
                      </span>
                    </div>
                    {i < TOTAL_STEPS - 1 && (
                      <div
                        className={`w-10 sm:w-14 h-px rounded-full transition-colors duration-500 mb-4 ${
                          i < step ? 'bg-primary/50' : 'bg-border/60'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content with slide animation */}
          <div className="p-6 sm:p-10 min-h-[380px] flex items-start">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="w-full"
              >
                {step === 0 && (
                  <OnboardingStepWelcome onStart={() => goTo(1)} onExplore={onSkip} />
                )}
                {step === 1 && (
                  <OnboardingStepGoal
                    initialGoal={initialGoal as GoalOption | null}
                    onNext={(goal) => goTo(2, { selected_goal: goal })}
                    onBack={() => goTo(0)}
                  />
                )}
                {step === 2 && (
                  <OnboardingStepRole
                    initialRole={initialRole as RoleOption | null}
                    onNext={(role) => goTo(3, { selected_role: role })}
                    onBack={() => goTo(1)}
                  />
                )}
                {step === 3 && (
                  <OnboardingStepCreateProject onComplete={onComplete} onBack={() => goTo(2)} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
