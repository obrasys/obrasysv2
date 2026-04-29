import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Ruler,
  Building2,
  PencilRuler,
  ListChecks,
  CheckCircle2,
  Circle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AxiaGuidedStep =
  | "calibrate"
  | "floors"
  | "measure"
  | "validate"
  | "done";

interface AxiaGuidedModeProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  /** Status booleans calculated by the parent */
  status: {
    calibrated: boolean;
    hasFloors: boolean;
    hasMeasurements: boolean;
    hasValidated: boolean;
  };
  /** Optional handlers for the action buttons in each step */
  onStartCalibration?: () => void;
  onCreateFloor?: () => void;
  onStartMeasure?: () => void;
  onOpenValidation?: () => void;
}

interface StepDef {
  id: AxiaGuidedStep;
  title: string;
  description: string;
  icon: typeof Ruler;
  isDone: boolean;
  action?: { label: string; onClick?: () => void };
}

export function AxiaGuidedMode({
  enabled,
  onToggle,
  status,
  onStartCalibration,
  onCreateFloor,
  onStartMeasure,
  onOpenValidation,
}: AxiaGuidedModeProps) {
  const steps: StepDef[] = useMemo(
    () => [
      {
        id: "calibrate",
        title: "1. Calibrar a planta",
        description:
          "Defina a escala real (ex.: marcar uma parede de 5 m) para que a Axia possa converter pixels em metros.",
        icon: Ruler,
        isDone: status.calibrated,
        action: { label: "Iniciar calibração", onClick: onStartCalibration },
      },
      {
        id: "floors",
        title: "2. Organizar pavimentos",
        description:
          "Crie pelo menos um pavimento (R/C, 1.º andar, cobertura…) e associe as páginas do PDF.",
        icon: Building2,
        isDone: status.hasFloors,
        action: { label: "Adicionar pavimento", onClick: onCreateFloor },
      },
      {
        id: "measure",
        title: "3. Medir com a Axia",
        description:
          "Marque compartimentos, paredes e elementos. A Axia sugere quantitativos e marca cada item com nível de confiança.",
        icon: PencilRuler,
        isDone: status.hasMeasurements,
        action: { label: "Iniciar medição", onClick: onStartMeasure },
      },
      {
        id: "validate",
        title: "4. Validar quantitativos",
        description:
          "Reveja itens marcados como “Provável” ou “Precisa validar” antes de enviar para orçamento.",
        icon: ListChecks,
        isDone: status.hasValidated,
        action: { label: "Abrir validação", onClick: onOpenValidation },
      },
    ],
    [status, onStartCalibration, onCreateFloor, onStartMeasure, onOpenValidation],
  );

  const completed = steps.filter((s) => s.isDone).length;
  const progress = Math.round((completed / steps.length) * 100);
  const currentStep = steps.find((s) => !s.isDone) ?? steps[steps.length - 1];

  if (!enabled) {
    return (
      <Card className="p-3 rounded-xl border-dashed bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Modo Guiado Axia</p>
              <p className="text-[11px] text-muted-foreground">
                Ative para receber orientação passo-a-passo na leitura da planta.
              </p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 rounded-xl border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              Modo Guiado Axia
              <Badge variant="secondary" className="text-[10px]">
                {completed}/{steps.length}
              </Badge>
            </p>
            <p className="text-[11px] text-muted-foreground">
              A Axia conduz a leitura: calibrar, organizar, medir e validar.
            </p>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 -mt-1 -mr-1"
          onClick={() => onToggle(false)}
          type="button"
          aria-label="Desativar modo guiado"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Progress value={progress} className="h-1.5" />

      <ol className="space-y-2">
        {steps.map((step) => {
          const Icon = step.icon;
          const isCurrent = step.id === currentStep.id && !step.isDone;
          return (
            <li
              key={step.id}
              className={cn(
                "flex gap-3 rounded-lg border p-2.5 transition-colors",
                step.isDone && "border-emerald-200 bg-emerald-500/5",
                isCurrent && "border-primary bg-primary/5 shadow-sm",
                !step.isDone && !isCurrent && "border-border opacity-70",
              )}
            >
              <div className="mt-0.5 shrink-0">
                {step.isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : isCurrent ? (
                  <Icon className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p
                  className={cn(
                    "text-xs font-semibold",
                    step.isDone && "text-emerald-700 dark:text-emerald-400",
                    isCurrent && "text-primary",
                  )}
                >
                  {step.title}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {step.description}
                </p>
                {isCurrent && step.action?.onClick && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 mt-1 text-xs"
                    onClick={step.action.onClick}
                    type="button"
                  >
                    {step.action.label}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {progress === 100 && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-200 p-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            Tudo pronto. Pode enviar quantitativos para orçamento com confiança.
          </span>
        </div>
      )}
    </Card>
  );
}
