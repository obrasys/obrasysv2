import { Building2, BarChart3, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Building2 className="w-8 h-8 text-primary" />
      </div>

      <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight">
        Organize a sua primeira obra em minutos
      </h1>

      <p className="text-muted-foreground mt-3 max-w-md text-base leading-relaxed">
        O Obra Sys ajuda-o a centralizar orçamento, execução, documentos e controlo num único sistema.
      </p>

      <p className="text-sm text-muted-foreground/80 mt-2">
        Comece com o essencial e ganhe estrutura desde o primeiro dia.
      </p>

      <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-sm">
        {highlights.map((h) => (
          <div
            key={h.label}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/60 border border-border/50"
          >
            <h.icon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground">{h.label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2.5 mt-10 w-full max-w-xs">
        <Button size="lg" onClick={onStart} className="w-full text-base font-semibold">
          Começar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExplore}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          Explorar primeiro
        </Button>
      </div>
    </div>
  );
}
