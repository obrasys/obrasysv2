import { Building2, BarChart3, Shield, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface Props {
  onStart: () => void;
  onExplore: () => void;
}

export function OnboardingStepWelcome({ onStart, onExplore }: Props) {
  const highlights = [
    { icon: Building2, label: 'Obras centralizadas' },
    { icon: BarChart3, label: 'Controlo financeiro' },
    { icon: Shield, label: 'Documentação organizada' },
    { icon: Zap, label: 'Execução com método' },
  ];

  return (
    <div className="flex flex-col items-center text-center px-2">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center mb-5"
      >
        <Building2 className="w-7 h-7 text-primary" />
      </motion.div>

      <h1 className="font-display text-2xl md:text-[28px] font-bold text-foreground leading-tight tracking-tight">
        A sua operação, organizada
      </h1>

      <p className="text-muted-foreground mt-2.5 max-w-md text-[15px] leading-relaxed">
        Centralize orçamento, execução e controlo num único sistema.
      </p>

      <div className="grid grid-cols-2 gap-2.5 mt-7 w-full max-w-sm">
        {highlights.map((h, i) => (
          <motion.div
            key={h.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.3 }}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/30"
          >
            <h.icon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-medium text-foreground/80">{h.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col gap-2 mt-9 w-full max-w-xs">
        <Button
          size="lg"
          onClick={onStart}
          className="w-full text-[15px] font-semibold gap-2 bg-primary hover:bg-primary/90 shadow-md shadow-primary/15"
        >
          Começar configuração
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExplore}
          className="w-full text-xs text-muted-foreground/70 hover:text-foreground"
        >
          Explorar primeiro
        </Button>
      </div>
    </div>
  );
}
