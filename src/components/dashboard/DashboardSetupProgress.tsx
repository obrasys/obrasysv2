import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, X, Rocket } from 'lucide-react';

interface SetupStep {
  label: string;
  done: boolean;
  weight: number;
  href: string;
}

interface DashboardSetupProgressProps {
  hasLogo: boolean;
  hasAddress: boolean;
  hasObra: boolean;
  hasOrcamento: boolean;
  hasRDO: boolean;
  hasEquipa: boolean;
}

const DISMISS_KEY = 'dashboard_setup_dismissed';

export function DashboardSetupProgress({
  hasLogo,
  hasAddress,
  hasObra,
  hasOrcamento,
  hasRDO,
  hasEquipa,
}: DashboardSetupProgressProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true');

  const steps: SetupStep[] = [
    { label: 'Adicionar logotipo da empresa', done: hasLogo, weight: 20, href: '/perfil' },
    { label: 'Preencher morada da empresa', done: hasAddress, weight: 15, href: '/perfil' },
    { label: 'Criar primeira obra', done: hasObra, weight: 25, href: '/obras' },
    { label: 'Criar primeiro orçamento', done: hasOrcamento, weight: 20, href: '/orcamentos' },
    { label: 'Registar primeiro RDO', done: hasRDO, weight: 10, href: '/rdos' },
    { label: 'Adicionar membro de equipa', done: hasEquipa, weight: 10, href: '/equipa' },
  ];

  const totalWeight = steps.reduce((s, st) => s + st.weight, 0);
  const doneWeight = steps.filter(s => s.done).reduce((s, st) => s + st.weight, 0);
  const percentage = Math.round((doneWeight / totalWeight) * 100);

  if (dismissed || percentage === 100) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  const pendingSteps = steps.filter(s => !s.done);

  return (
    <Card className="rounded-xl border-primary/20 bg-primary/5 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Configure a sua conta</h3>
              <p className="text-xs text-muted-foreground">{percentage}% concluído - falta pouco!</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <Progress value={percentage} className="h-2 mb-4" />

        <div className="space-y-2">
          {pendingSteps.slice(0, 3).map((step) => (
            <button
              key={step.label}
              onClick={() => navigate(step.href)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-left"
            >
              <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground flex-1">{step.label}</span>
              <span className="text-xs text-primary font-medium">Completar</span>
            </button>
          ))}
          {steps.filter(s => s.done).slice(0, 2).map((step) => (
            <div key={step.label} className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-60">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-sm text-foreground line-through">{step.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
