import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  icon: React.ReactNode;
  title: string;
  benefit: string;
  completed: boolean;
  ctaLabel: string;
  onAction: () => void;
}

export function OnboardingChecklistItem({ icon, title, benefit, completed, ctaLabel, onAction }: Props) {
  return (
    <div
      className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all duration-200 ${
        completed
          ? 'bg-green-50/60 border-green-200/50 dark:bg-green-950/20 dark:border-green-800/30'
          : 'bg-card border-border hover:border-primary/30 hover:shadow-sm'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          completed
            ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
            : 'bg-primary/10 text-primary'
        }`}
      >
        {completed ? <CheckCircle2 className="w-5 h-5" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4
          className={`text-sm font-semibold ${
            completed ? 'text-green-700 dark:text-green-400 line-through' : 'text-foreground'
          }`}
        >
          {title}
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{benefit}</p>
      </div>
      {!completed && (
        <Button size="sm" variant="outline" className="shrink-0 h-8 text-xs gap-1" onClick={onAction}>
          {ctaLabel}
          <ChevronRight className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
