import { useState } from 'react';
import { Briefcase, HardHat, Calculator, Shield, MoreHorizontal, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type RoleOption = 'diretor' | 'gestor_obra' | 'orcamentista' | 'tecnico_fiscal' | 'outro';

interface Props {
  initialRole?: RoleOption | null;
  onNext: (role: RoleOption) => void;
  onBack: () => void;
}

const roles: { id: RoleOption; icon: typeof Briefcase; label: string }[] = [
  { id: 'diretor', icon: Briefcase, label: 'Diretor / Dono da empresa' },
  { id: 'gestor_obra', icon: HardHat, label: 'Gestor de obra' },
  { id: 'orcamentista', icon: Calculator, label: 'Orçamentista' },
  { id: 'tecnico_fiscal', icon: Shield, label: 'Técnico / Fiscal' },
  { id: 'outro', icon: MoreHorizontal, label: 'Outro' },
];

export function OnboardingStepRole({ initialRole, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<RoleOption | null>(initialRole ?? null);

  return (
    <div className="flex flex-col items-center px-2">
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground text-center">
        Qual é o seu papel principal?
      </h2>
      <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
        Isto ajuda-nos a adaptar a experiência ao seu dia-a-dia.
      </p>

      <div className="flex flex-col gap-2.5 mt-8 w-full max-w-sm">
        {roles.map((r) => {
          const isSelected = selected === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/30'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                <r.icon className="w-4.5 h-4.5" />
              </div>
              <span className="text-sm font-medium text-foreground flex-1">{r.label}</span>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
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
