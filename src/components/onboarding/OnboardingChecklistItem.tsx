import { Check, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  icon: React.ReactNode;
  title: string;
  benefit: string;
  completed: boolean;
  ctaLabel: string;
  onAction: () => void;
}

export function OnboardingChecklistItem({ icon, title, benefit, completed, ctaLabel, onAction }: Props) {
  if (completed) {
    return (
      <motion.div
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
      >
        <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Check className="w-3 h-3 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground">{title}</span>
      </motion.div>
    );
  }

  return (
    <button
      onClick={onAction}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/60 bg-card hover:border-primary/25 hover:bg-primary/[0.02] transition-all duration-200 group text-left"
    >
      <div className="w-8 h-8 rounded-lg bg-primary/8 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/12 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[13px] font-medium text-foreground leading-tight">{title}</h4>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{benefit}</p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}
