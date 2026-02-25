import { Check, User, Wrench, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Step {
  number: number;
  label: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  { number: 1, label: 'Cliente', icon: User },
  { number: 2, label: 'Trabalhos', icon: Wrench },
  { number: 3, label: 'Finalizar', icon: Sparkles },
];

interface EssencialWizardProgressProps {
  currentStep: number;
}

export function EssencialWizardProgress({ currentStep }: EssencialWizardProgressProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-5 left-[10%] right-[10%] h-[2px] bg-border" />
        {/* Active line */}
        <motion.div
          className="absolute top-5 left-[10%] h-[2px] bg-primary"
          initial={false}
          animate={{
            width: currentStep === 1 ? '0%' : currentStep === 2 ? '40%' : '80%',
          }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />

        {STEPS.map((step) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const Icon = step.icon;

          return (
            <div key={step.number} className="flex flex-col items-center gap-2 z-10">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300',
                  isCompleted
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : isCurrent
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : 'bg-card text-muted-foreground border-2 border-border'
                )}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Check className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </motion.div>
              <span
                className={cn(
                  'text-xs font-semibold whitespace-nowrap transition-colors',
                  isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
