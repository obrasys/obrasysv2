import { useState, useCallback } from 'react';
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

export function OnboardingWizard({
  initialStep,
  initialGoal,
  initialRole,
  onUpdateStep,
  onComplete,
  onSkip,
}: Props) {
  const [step, setStep] = useState(Math.max(0, Math.min(initialStep, 3)));

  const goTo = useCallback(
    (s: number, data?: Record<string, string>) => {
      setStep(s);
      onUpdateStep(s, data);
    },
    [onUpdateStep],
  );

  return (
    <div className="w-full flex flex-col items-center">
      {/* Container */}
      <div className="w-full max-w-2xl mx-auto bg-card rounded-2xl shadow-xl border border-border/60 overflow-hidden">
        {/* Stepper — hidden on step 0 (welcome) */}
        {step > 0 && (
          <div className="flex items-center justify-center gap-2 pt-6 pb-2 px-6">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i < step
                      ? 'bg-primary text-primary-foreground'
                      : i === step
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </div>
                {i < TOTAL_STEPS - 1 && (
                  <div
                    className={`w-8 sm:w-12 h-0.5 rounded-full transition-colors ${
                      i < step ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="p-6 sm:p-10">
          {step === 0 && (
            <OnboardingStepWelcome
              onStart={() => goTo(1)}
              onExplore={onSkip}
            />
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
            <OnboardingStepCreateProject
              onComplete={onComplete}
              onBack={() => goTo(2)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
