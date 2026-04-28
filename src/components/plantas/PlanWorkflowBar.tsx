import { Check, Ruler, MousePointer2, Brain, FileSpreadsheet, Minus, Pentagon, Hash, SquareDashed, Wallpaper, DoorOpen, Undo2, ChevronRight, Lightbulb, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import type { MeasureMode } from "./PlanMeasurementToolbar";

export type WorkflowStep = "calibrate" | "measure" | "analyze" | "budget";

interface StepDef {
  id: WorkflowStep;
  label: string;
  icon: typeof Ruler;
}

const STEPS: StepDef[] = [
  { id: "calibrate", label: "Calibrar", icon: Ruler },
  { id: "measure", label: "Medir", icon: MousePointer2 },
  { id: "analyze", label: "Axia™", icon: Brain },
  { id: "budget", label: "Orçamentar", icon: FileSpreadsheet },
];

const STEP_HINTS: Record<WorkflowStep, { title: string; getMessage: (count: number, hasAnalysis: boolean) => string; actionLabel?: string }> = {
  calibrate: {
    title: "Calibrar escala",
    getMessage: () => "Selecione 2 pontos de uma medida conhecida e introduza a distância real.",
    actionLabel: "Iniciar Calibração",
  },
  measure: {
    title: "Medir e marcar",
    getMessage: (count) =>
      count === 0
        ? "Use as ferramentas abaixo. Duplo-clique (ou botão ✓) para finalizar cada medição."
        : `${count} elementos marcados. Continue ou avance para a Axia™.`,
  },
  analyze: {
    title: "Análise Axia™",
    getMessage: (_, has) => (has ? "Análise concluída. Revise as sugestões no painel à direita." : "A Axia™ identifica cotas, compartimentos e elementos automaticamente."),
    actionLabel: "Analisar com Axia™",
  },
  budget: {
    title: "Orçamentar",
    getMessage: () => "Mapeie as medições para artigos e gere o pré-orçamento.",
    actionLabel: "Ver Quantitativos",
  },
};

const MODE_HINTS: Record<MeasureMode, string> = {
  view: "Arraste para mover · scroll para zoom",
  calibrate: "Selecione 2 pontos de uma distância conhecida",
  measure_line: "Clique nos pontos da linha · Duplo-clique para finalizar",
  measure_area: "Clique nos vértices da área · Duplo-clique para fechar",
  measure_count: "Clique para marcar cada elemento",
  draw_room: "Clique nos cantos do compartimento · Duplo-clique para fechar",
  draw_wall: "Clique no início e fim da parede (2 pontos)",
  draw_opening: "Clique sobre uma parede existente para inserir o vão",
  insert_element: "Clique na planta para inserir · ESC para terminar",
};

interface ToolDef {
  id: MeasureMode;
  icon: typeof MousePointer2;
  label: string;
  tip: string;
  group: "nav" | "measure" | "draw";
}

const TOOLS: ToolDef[] = [
  { id: "view", icon: Cursor, label: "Navegar", tip: "Arrastar e zoom", group: "nav" },
  { id: "measure_line", icon: Minus, label: "Linha", tip: "Medir comprimentos", group: "measure" },
  { id: "measure_area", icon: Pentagon, label: "Área", tip: "Medir áreas", group: "measure" },
  { id: "measure_count", icon: Hash, label: "Contagem", tip: "Contar elementos", group: "measure" },
  { id: "draw_room", icon: SquareDashed, label: "Compart.", tip: "Marcar compartimento (polígono)", group: "draw" },
  { id: "draw_wall", icon: Wallpaper, label: "Parede", tip: "Marcar parede (2 pontos)", group: "draw" },
  { id: "draw_opening", icon: DoorOpen, label: "Vão", tip: "Inserir porta/janela sobre parede", group: "draw" },
];

interface Props {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  onStepClick: (step: WorkflowStep) => void;
  // Toolbar
  mode: MeasureMode;
  onModeChange: (mode: MeasureMode) => void;
  canMeasure: boolean;
  onUndo: () => void;
  hasActivePoints: boolean;
  // Guide
  measurementCount: number;
  hasAnalysis: boolean;
  onPrimaryAction?: () => void;
  // Right slot (e.g. symbol picker)
  rightSlot?: React.ReactNode;
}

export function PlanWorkflowBar({
  currentStep,
  completedSteps,
  onStepClick,
  mode,
  onModeChange,
  canMeasure,
  onUndo,
  hasActivePoints,
  measurementCount,
  hasAnalysis,
  onPrimaryAction,
  rightSlot,
}: Props) {
  const guide = STEP_HINTS[currentStep];
  const message = guide.getMessage(measurementCount, hasAnalysis);
  const showAction = guide.actionLabel && onPrimaryAction && (
    (currentStep === "calibrate" && !canMeasure) ||
    (currentStep === "analyze" && !hasAnalysis) ||
    currentStep === "budget"
  );
  const activeHint = mode !== "view" ? MODE_HINTS[mode] : null;

  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
      {/* Row 1: Stepper */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/20">
        {STEPS.map((step, i) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isClickable = isCompleted || isCurrent || (i > 0 && completedSteps.includes(STEPS[i - 1].id));
          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-xs",
                  isCurrent && "bg-primary text-primary-foreground font-medium shadow-sm",
                  !isCurrent && isClickable && "hover:bg-muted text-foreground",
                  !isClickable && "opacity-40 cursor-not-allowed text-muted-foreground"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full shrink-0",
                  isCurrent && "bg-primary-foreground/20",
                  !isCurrent && isCompleted && "bg-primary text-primary-foreground",
                  !isCurrent && !isCompleted && "bg-muted-foreground/20"
                )}>
                  {isCompleted && !isCurrent ? <Check className="w-3 h-3" /> : <step.icon className="w-3 h-3" />}
                </div>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/50 mx-0.5" />}
            </div>
          );
        })}

        <div className="flex-1" />

        {/* Contextual guide message */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-muted-foreground truncate max-w-[420px]">{message}</span>
        </div>

        {showAction && (
          <Button size="sm" variant="outline" className="h-7 text-xs ml-2 shrink-0" onClick={onPrimaryAction}>
            {guide.actionLabel}
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      {/* Row 2: Toolbar (only when measuring step or already calibrated) */}
      {canMeasure && (
        <div className="flex items-center gap-1 px-3 py-2 flex-wrap">
          {TOOLS.map((tool, idx) => {
            const prev = TOOLS[idx - 1];
            const showSeparator = prev && prev.group !== tool.group;
            const disabled = tool.id !== "view" && !canMeasure;
            return (
              <div key={tool.id} className="flex items-center">
                {showSeparator && <Separator orientation="vertical" className="h-6 mx-1.5" />}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={mode === tool.id ? "default" : "ghost"}
                      size="sm"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => onModeChange(tool.id)}
                      disabled={disabled}
                    >
                      <tool.icon className="w-3.5 h-3.5 mr-1" />
                      <span className="hidden sm:inline">{tool.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{tool.tip}</TooltipContent>
                </Tooltip>
              </div>
            );
          })}

          {hasActivePoints && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 ml-1" onClick={onUndo}>
                  <Undo2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Desfazer último ponto</TooltipContent>
            </Tooltip>
          )}

          <div className="flex-1" />

          {rightSlot}
        </div>
      )}

      {/* Active mode hint strip */}
      {activeHint && (
        <div className="px-3 py-1.5 bg-primary/5 border-t text-xs text-primary flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="font-medium">💡 {activeHint}</span>
        </div>
      )}
    </div>
  );
}
