import { Check, Ruler, MousePointer2, Brain, FileSpreadsheet, Minus, Pentagon, Hash, SquareDashed, Wallpaper, DoorOpen, Undo2, ChevronRight, Lightbulb, ArrowRight, Lock, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

export interface ChecklistItem {
  label: string;
  done: boolean;
  hint?: string;
}

interface ChecklistContext {
  canMeasure: boolean;
  measurementCount: number;
  roomCount: number;
  wallCount: number;
  openingCount: number;
  hasAnalysis: boolean;
  placedElementsCount: number;
}

function buildChecklist(step: WorkflowStep, ctx: ChecklistContext): ChecklistItem[] {
  switch (step) {
    case "calibrate":
      return [
        { label: "Planta carregada e visível", done: true },
        { label: "Calibração da escala guardada", done: ctx.canMeasure, hint: "Use 'Iniciar Calibração' e selecione 2 pontos com distância conhecida." },
      ];
    case "measure":
      return [
        { label: "Escala calibrada", done: ctx.canMeasure, hint: "Volte ao passo Calibrar para definir a escala." },
        {
          label: "Pelo menos 1 medição/compartimento/parede",
          done: ctx.measurementCount + ctx.roomCount + ctx.wallCount > 0,
          hint: "Use a barra de ferramentas (Linha, Área, Compart., Parede).",
        },
      ];
    case "analyze":
      return [
        { label: "Escala calibrada", done: ctx.canMeasure },
        { label: "Análise Axia™ executada", done: ctx.hasAnalysis, hint: "Clique em 'Analisar com Axia™' no painel à direita." },
      ];
    case "budget":
      return [
        { label: "Escala calibrada", done: ctx.canMeasure },
        {
          label: "Tem medições ou compartimentos",
          done: ctx.measurementCount + ctx.roomCount > 0,
          hint: "Sem dados a quantificar, o orçamento ficará vazio.",
        },
      ];
  }
}

function isStepUnlocked(step: WorkflowStep, ctx: ChecklistContext): boolean {
  switch (step) {
    case "calibrate":
      return true;
    case "measure":
      return ctx.canMeasure;
    case "analyze":
      return ctx.canMeasure;
    case "budget":
      return ctx.canMeasure && ctx.measurementCount + ctx.roomCount > 0;
  }
}

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
  { id: "view", icon: MousePointer2, label: "Navegar", tip: "Arrastar e zoom", group: "nav" },
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
  // Checklist context
  roomCount?: number;
  wallCount?: number;
  openingCount?: number;
  placedElementsCount?: number;
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
  roomCount = 0,
  wallCount = 0,
  openingCount = 0,
  placedElementsCount = 0,
}: Props) {
  const ctx: ChecklistContext = {
    canMeasure,
    measurementCount,
    roomCount,
    wallCount,
    openingCount,
    hasAnalysis,
    placedElementsCount,
  };
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
          const unlocked = isStepUnlocked(step.id, ctx);
          const isClickable = isCompleted || isCurrent || unlocked;
          const checklist = buildChecklist(step.id, ctx);
          const pending = checklist.filter((c) => !c.done).length;

          return (
            <div key={step.id} className="flex items-center">
              <Popover>
                <div className="relative flex items-center">
                  <button
                    onClick={() => isClickable && onStepClick(step.id)}
                    disabled={!isClickable}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-xs",
                      isCurrent && "bg-primary text-primary-foreground font-medium shadow-sm",
                      !isCurrent && isClickable && "hover:bg-muted text-foreground",
                      !isClickable && "opacity-60 cursor-not-allowed text-muted-foreground"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-5 h-5 rounded-full shrink-0",
                      isCurrent && "bg-primary-foreground/20",
                      !isCurrent && isCompleted && "bg-primary text-primary-foreground",
                      !isCurrent && !isCompleted && unlocked && "bg-muted-foreground/20",
                      !isCurrent && !isCompleted && !unlocked && "bg-muted-foreground/10"
                    )}>
                      {!unlocked && !isCompleted ? (
                        <Lock className="w-3 h-3" />
                      ) : isCompleted && !isCurrent ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <step.icon className="w-3 h-3" />
                      )}
                    </div>
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Requisitos do passo ${step.label}`}
                      className={cn(
                        "ml-1 flex items-center justify-center w-4 h-4 rounded-full transition-colors",
                        pending > 0
                          ? "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25"
                          : "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                      )}
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </PopoverTrigger>
                </div>
                <PopoverContent align="start" className="w-72 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <step.icon className="w-3.5 h-3.5 text-primary" />
                      {STEP_HINTS[step.id].title}
                    </p>
                    {pending === 0 ? (
                      <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Pronto
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        {pending} pendente{pending > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {checklist.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs">
                        <div className={cn(
                          "mt-0.5 flex items-center justify-center w-4 h-4 rounded-full shrink-0",
                          item.done ? "bg-emerald-500 text-white" : "bg-muted border border-border"
                        )}>
                          {item.done ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1">
                          <p className={cn(item.done ? "text-muted-foreground line-through" : "text-foreground font-medium")}>
                            {item.label}
                          </p>
                          {!item.done && item.hint && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{item.hint}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
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

      {/* Row 1.5: Blocking checklist for current step (when there are pending requirements) */}
      {(() => {
        const currentChecklist = buildChecklist(currentStep, ctx);
        const pendingItems = currentChecklist.filter((c) => !c.done);
        if (pendingItems.length === 0) return null;
        return (
          <div className="px-3 py-2 bg-amber-500/5 border-b border-amber-500/20 flex items-start gap-2 text-xs">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-amber-700 font-medium mb-1">
                Para concluir este passo, falta:
              </p>
              <ul className="space-y-0.5">
                {pendingItems.map((item, idx) => (
                  <li key={idx} className="text-muted-foreground flex items-start gap-1.5">
                    <span className="text-amber-600 shrink-0">•</span>
                    <span>
                      <span className="text-foreground">{item.label}.</span>
                      {item.hint && <span className="text-muted-foreground ml-1">{item.hint}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })()}

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
