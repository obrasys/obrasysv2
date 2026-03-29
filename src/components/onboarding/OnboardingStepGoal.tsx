import { useState } from 'react';
import { Building2, FileText, ClipboardList, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type GoalOption = 'organizar_obra' | 'criar_orcamento' | 'acompanhar_execucao' | 'centralizar_equipa';

interface Props {
  initialGoal?: GoalOption | null;
  onNext: (goal: GoalOption) => void;
  onBack: () => void;
}

const goals: { id: GoalOption; icon: typeof Building2; title: string; description: string }[] = [
  {
    id: 'organizar_obra',
    icon: Building2,
    title: 'Organizar uma nova obra',
    description: 'Centralize tudo desde o arranque e ganhe controlo operacional.',
  },
  {
    id: 'criar_orcamento',
    icon: FileText,
    title: 'Criar um orçamento mais profissional',
    description: 'Estruture proposta, capítulos e valores com mais confiança.',
  },
  {
    id: 'acompanhar_execucao',
    icon: ClipboardList,
    title: 'Acompanhar a execução no terreno',
    description: 'Comece a registar progresso e ocorrências com método.',
  },
  {
    id: 'centralizar_equipa',
    icon: Users,
    title: 'Centralizar equipa e documentos',
    description: 'Traga comunicação, ficheiros e estrutura para o mesmo lugar.',
  },
];

export function OnboardingStepGoal({ initialGoal, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<GoalOption | null>(initialGoal ?? null);

  return (
    <div className="flex flex-col items-center px-2">
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground text-center">
        O que quer resolver primeiro?
      </h2>
      <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
        Vamos adaptar a sua experiência ao que é mais urgente para si.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full">
        {goals.map((g) => {
          const isSelected = selected === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setSelected(g.id)}
              className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/30 hover:bg-secondary/30'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                <g.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">{g.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{g.description}</p>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 mt-10 w-full max-w-xs">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Voltar
        </Button>
        <Button onClick={() => selected && onNext(selected)} disabled={!selected} className="flex-1">
          Continuar
        </Button>
      </div>
    </div>
  );
}
