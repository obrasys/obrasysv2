import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Building2, FileText, Users, ClipboardList, CheckCircle2, ChevronRight, X } from 'lucide-react';

interface StepData {
  completed: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  microcopy: string;
  buttonLabel: string;
  route: string;
}

interface Props {
  step1: boolean;
  step2: boolean;
  step3: boolean;
  step4: boolean;
  percentage: number;
  onDismiss: () => void;
}

export function OnboardingChecklist({ step1, step2, step3, step4, percentage, onDismiss }: Props) {
  const navigate = useNavigate();

  const steps: StepData[] = [
    {
      completed: step1,
      icon: <Building2 className="w-5 h-5" />,
      title: 'Crie a sua primeira obra',
      description: 'É aqui que tudo começa. Adicione o nome da obra, cliente e localização para ter uma base organizada desde o primeiro dia.',
      microcopy: 'Leva menos de 1 minuto.',
      buttonLabel: 'Criar Obra',
      route: '/obras/criar',
    },
    {
      completed: step2,
      icon: <FileText className="w-5 h-5" />,
      title: 'Estruture o orçamento',
      description: 'Defina materiais, mão de obra e margens. Tenha clareza total sobre custos e lucro antes mesmo da obra avançar.',
      microcopy: 'O controlo financeiro começa aqui.',
      buttonLabel: 'Criar Orçamento',
      route: '/orcamentos/criar',
    },
    {
      completed: step3,
      icon: <Users className="w-5 h-5" />,
      title: 'Associe a sua equipa',
      description: 'Adicione colaboradores ou subempreiteiros e distribua responsabilidades. Centralize tudo num único sistema.',
      microcopy: 'Evite mensagens soltas e falta de comunicação.',
      buttonLabel: 'Adicionar Colaborador',
      route: '/recursos',
    },
    {
      completed: step4,
      icon: <ClipboardList className="w-5 h-5" />,
      title: 'Registe o progresso',
      description: 'Faça o primeiro registo diário de obra. Fotografias, observações e evolução ficam guardadas e organizadas.',
      microcopy: 'Transparência total para si e para o cliente.',
      buttonLabel: 'Criar RDO',
      route: '/rdos/criar',
    },
  ];

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-background to-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">
              Primeiros Passos para Dominar a Sua Obra
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Complete estes 4 passos e desbloqueie o controlo total da sua gestão.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0" onClick={onDismiss}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progresso</span>
            <span className="font-medium">{Math.round(percentage)}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              step.completed
                ? 'bg-green-50/50 border-green-200/50 dark:bg-green-950/20 dark:border-green-800/30'
                : 'bg-background border-border hover:border-accent/30'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              step.completed
                ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                : 'bg-muted text-muted-foreground'
            }`}>
              {step.completed ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-medium ${step.completed ? 'text-green-700 dark:text-green-400 line-through' : 'text-foreground'}`}>
                {step.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {step.description}
              </p>
              {!step.completed && (
                <div className="flex items-center gap-2 mt-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(step.route)}>
                    {step.buttonLabel}
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                  <span className="text-[11px] text-muted-foreground italic">{step.microcopy}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
