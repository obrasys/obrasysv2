import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, Ruler, MousePointer2, Brain, FileSpreadsheet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkflowStep } from "./PlanWorkflowStepper";

interface Props {
  step: WorkflowStep;
  isCalibrated: boolean;
  measurementCount: number;
  hasAnalysis: boolean;
  onAction?: () => void;
}

const GUIDES: Record<WorkflowStep, { icon: typeof Ruler; title: string; getMessage: (p: Props) => string; actionLabel?: string }> = {
  calibrate: {
    icon: Ruler,
    title: "Passo 1: Calibrar Escala",
    getMessage: (p) =>
      p.isCalibrated
        ? "✅ Escala calibrada! Pode avançar para medir ou recalibrar se necessário."
        : "Clique em 'Iniciar Calibração' no painel à direita. Selecione dois pontos de uma medida conhecida na planta e introduza a distância real.",
    actionLabel: "Iniciar Calibração",
  },
  measure: {
    icon: MousePointer2,
    title: "Passo 2: Medir e Marcar",
    getMessage: (p) =>
      p.measurementCount === 0
        ? "Use a barra de ferramentas para medir linhas, áreas, marcar compartimentos e paredes. Duplo-clique para finalizar cada medição."
        : `Tem ${p.measurementCount} medições. Continue a medir ou avance para a análise Axia™.`,
  },
  analyze: {
    icon: Brain,
    title: "Passo 3: Análise Axia™",
    getMessage: (p) =>
      p.hasAnalysis
        ? "✅ Análise concluída. Revise as sugestões, converta cotas em medições e valide os resultados."
        : "A Axia™ analisa a planta para identificar cotas, compartimentos e elementos construtivos automaticamente. Clique em 'Analisar com IA' no painel.",
    actionLabel: "Analisar com Axia™",
  },
  budget: {
    icon: FileSpreadsheet,
    title: "Passo 4: Orçamentar",
    getMessage: () =>
      "Mapeie as medições para artigos de orçamento. Aceda à vista de Quantitativos para associar cada medição a artigos e gerar o pré-orçamento.",
    actionLabel: "Ver Quantitativos",
  },
};

export function PlanContextualGuide({ step, isCalibrated, measurementCount, hasAnalysis, onAction }: Props) {
  const guide = GUIDES[step];
  const message = guide.getMessage({ step, isCalibrated, measurementCount, hasAnalysis });
  const showAction = guide.actionLabel && onAction && (
    (step === "calibrate" && !isCalibrated) ||
    (step === "analyze" && !hasAnalysis) ||
    step === "budget"
  );

  return (
    <Alert className="border-primary/20 bg-primary/5">
      <Lightbulb className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-primary mb-0.5">{guide.title}</p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
        {showAction && (
          <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={onAction}>
            {guide.actionLabel} <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
