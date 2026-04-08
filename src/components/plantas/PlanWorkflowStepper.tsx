import { Check, Ruler, MousePointer2, Brain, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowStep = "calibrate" | "measure" | "analyze" | "budget";

interface StepDef {
  id: WorkflowStep;
  label: string;
  icon: typeof Ruler;
  description: string;
}

const STEPS: StepDef[] = [
  { id: "calibrate", label: "Calibrar", icon: Ruler, description: "Definir a escala da planta" },
  { id: "measure", label: "Medir", icon: MousePointer2, description: "Marcar medições e compartimentos" },
  { id: "analyze", label: "Axia™", icon: Brain, description: "Análise inteligente automática" },
  { id: "budget", label: "Orçamentar", icon: FileSpreadsheet, description: "Mapear para artigos" },
];

interface Props {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  onStepClick: (step: WorkflowStep) => void;
}

export function PlanWorkflowStepper({ currentStep, completedSteps, onStepClick }: Props) {
  return (
    <div className="flex items-center justify-between bg-card border rounded-xl px-4 py-3 shadow-sm">
      {STEPS.map((step, i) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = currentStep === step.id;
        const isClickable = isCompleted || isCurrent || (i > 0 && completedSteps.includes(STEPS[i - 1].id));

        return (
          <div key={step.id} className="flex items-center flex-1">
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-left group",
                isCurrent && "bg-primary/10 ring-1 ring-primary/30",
                isClickable && !isCurrent && "hover:bg-muted cursor-pointer",
                !isClickable && "opacity-40 cursor-not-allowed"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-colors",
                isCompleted && !isCurrent && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary text-primary-foreground",
                !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
              )}>
                {isCompleted && !isCurrent ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <step.icon className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="hidden sm:block">
                <p className={cn(
                  "text-xs font-medium leading-tight",
                  isCurrent ? "text-primary" : "text-foreground"
                )}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">{step.description}</p>
              </div>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "flex-1 h-px mx-2",
                isCompleted ? "bg-primary/40" : "bg-border"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
