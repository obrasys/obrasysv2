import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  number: number;
  label: string;
}

const STEPS: Step[] = [
  { number: 1, label: 'Cliente' },
  { number: 2, label: 'Trabalhos' },
  { number: 3, label: 'Lucro & Envio' },
];

interface EssencialWizardProgressProps {
  currentStep: number;
}

export function EssencialWizardProgress({ currentStep }: EssencialWizardProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                  currentStep > step.number
                    ? 'bg-primary text-primary-foreground'
                    : currentStep === step.number
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {currentStep > step.number ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-3 mt-[-1.25rem] transition-colors',
                  currentStep > step.number ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
