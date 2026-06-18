import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RevisaoAssistida } from '@/components/orcamentos/inteligente/RevisaoAssistida';
import { cn } from '@/lib/utils';

import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Upload,
  Sparkles,
  ShieldCheck,
  Save,
  CheckCircle2,
  Info,
} from 'lucide-react';

type StepId = 'contexto' | 'documentos' | 'estruturacao' | 'revisao' | 'gravar';

interface Step {
  id: StepId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  {
    id: 'contexto',
    title: 'Contexto da obra',
    description: 'Cliente, prazo previsto e regime fiscal aplicável.',
    icon: FileText,
  },
  {
    id: 'documentos',
    title: 'Importar documentos',
    description: 'PDF, Excel, caderno de encargos, mapa de quantidades, planta.',
    icon: Upload,
  },
  {
    id: 'estruturacao',
    title: 'Estruturação assistida',
    description: 'A Axia organiza capítulos, artigos, unidades e quantidades.',
    icon: Sparkles,
  },
  {
    id: 'revisao',
    title: 'Revisão humana',
    description: 'Validar dúvidas, quantidades suspeitas e itens pendentes.',
    icon: ShieldCheck,
  },
  {
    id: 'gravar',
    title: 'Gravar rascunho',
    description: 'Cria o orçamento como rascunho pronto para auditoria.',
    icon: Save,
  },
];

export default function OrcamentacaoInteligentePage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [orcamentoId] = useState<string | null>(null);
  const [budgetVersionId] = useState<string | null>(null);
  const [canProceedReview, setCanProceedReview] = useState(true);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isReviewBlocked = step.id === 'gravar' && !canProceedReview;


  return (
    <AppLayout
      title="Orçamentação Inteligente"
      subtitle="Fluxo guiado de extração, estruturação e revisão assistida"
    >
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        {/* Aviso de fase */}
        <Card className="border-amber-300/60 bg-amber-50/40">
          <CardContent className="flex gap-3 p-4 text-sm">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Fluxo em construção (Fase 1)</p>
              <p className="text-amber-800/80">
                Esqueleto do wizard. A extração com Axia, a revisão assistida obrigatória
                e a auditoria automática chegam nas fases seguintes. Esta análise
                requer sempre validação humana.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stepper */}
        <ol className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {STEPS.map((s, idx) => {
            const done = idx < currentStep;
            const active = idx === currentStep;
            const Icon = s.icon;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={cn(
                    'w-full text-left rounded-xl border p-3 transition-colors',
                    active && 'border-primary bg-primary/5',
                    done && 'border-emerald-300 bg-emerald-50/50',
                    !active && !done && 'border-border hover:bg-muted/50',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={cn(
                        'h-7 w-7 rounded-lg flex items-center justify-center text-xs font-semibold',
                        active && 'bg-primary text-primary-foreground',
                        done && 'bg-emerald-500 text-white',
                        !active && !done && 'bg-muted text-muted-foreground',
                      )}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                    </div>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-medium leading-tight">{s.title}</p>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Step content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <step.icon className="h-5 w-5 text-primary" />
                  {step.title}
                </CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </div>
              <Badge variant="outline">Passo {currentStep + 1} / {STEPS.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {step.id === 'revisao' ? (
              <RevisaoAssistida
                orcamentoId={orcamentoId}
                budgetVersionId={budgetVersionId}
                onCanProceedChange={setCanProceedReview}
              />
            ) : (
              <StepPlaceholder stepId={step.id} />
            )}
          </CardContent>
        </Card>

        {/* Nav */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => (currentStep === 0 ? navigate('/orcamentos') : setCurrentStep((s) => s - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {currentStep === 0 ? 'Sair' : 'Anterior'}
          </Button>
          <Button
            disabled={isLast || isReviewBlocked}
            title={isReviewBlocked ? 'Resolve os itens críticos antes de continuar' : undefined}
            onClick={() => setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1))}
          >
            {isLast ? 'Concluir (em breve)' : 'Próximo'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

function StepPlaceholder({ stepId }: { stepId: StepId }) {
  const content: Record<StepId, { todo: string[] }> = {
    contexto: {
      todo: [
        'Selecionar cliente existente ou criar rápido',
        'Definir prazo previsto e local da obra',
        'Escolher regime fiscal (IVA 23%, 6%, autoliquidação)',
      ],
    },
    documentos: {
      todo: [
        'Upload de PDF, Excel, caderno de encargos',
        'Upload de planta (PDF ou DXF quando disponível)',
        'Pré-visualização e remoção antes de processar',
      ],
    },
    estruturacao: {
      todo: [
        'Chamada ao motor Axia (via gateway, sem expor provider)',
        'Organização em capítulos / artigos / unidades / quantidades',
        'Marcação de dúvidas e pendentes para revisão',
      ],
    },
    revisao: {
      todo: [
        'Lista de itens em axia_budget_review_items',
        'Aceitar, corrigir ou rejeitar cada sugestão',
        'Bloquear gravação enquanto existirem itens críticos pendentes',
      ],
    },
    gravar: {
      todo: [
        'Criar orcamento em estado rascunho',
        'Persistir capítulos e artigos validados',
        'Redirecionar para edição/auditoria',
      ],
    },
  };

  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <p>A implementar nas fases seguintes:</p>
      <ul className="list-disc pl-5 space-y-1">
        {content[stepId].todo.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
