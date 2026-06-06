/**
 * Fase 10 — Stepper de 7 etapas do fluxo Planta → Orçamento ICF.
 *
 * Puro presentational: recebe o estado derivado e mostra a etapa atual.
 * Não controla a navegação — o utilizador avança naturalmente pelo
 * `IcfPlantAnalyzer` e este indicador mantém-se sempre visível para
 * dar contexto do passo onde está.
 */

import { Check, Upload, FileType2, Ruler, Settings2, ListChecks, Calculator, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export type IcfPlantaStep =
  | "upload"
  | "tipo"
  | "escala"
  | "parametros"
  | "revisao"
  | "quantitativo"
  | "orcamento";

interface StepDef {
  id: IcfPlantaStep;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDef[] = [
  { id: "upload", label: "Upload da planta", short: "Upload", icon: Upload },
  { id: "tipo", label: "Identificar tipo", short: "Tipo", icon: FileType2 },
  { id: "escala", label: "Confirmar escala/unidade", short: "Escala", icon: Ruler },
  { id: "parametros", label: "Parâmetros ICF", short: "Parâmetros", icon: Settings2 },
  { id: "revisao", label: "Rever elementos", short: "Revisão", icon: ListChecks },
  { id: "quantitativo", label: "Gerar quantitativo", short: "Quantitativo", icon: Calculator },
  { id: "orcamento", label: "Enviar para orçamento", short: "Orçamento", icon: Send },
];

interface Props {
  current: IcfPlantaStep;
  /** Etapas já consideradas concluídas (preenchimento à esquerda). */
  completed?: IcfPlantaStep[];
  /** Etapas bloqueadas/erro (ex.: gate de confiança falhou). */
  blocked?: IcfPlantaStep[];
  className?: string;
}

export function IcfPlantaStepper({ current, completed = [], blocked = [], className }: Props) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <div className={cn("w-full", className)}>
      <ol className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const isCurrent = s.id === current;
          const isCompleted = completed.includes(s.id) || (i < currentIdx && !blocked.includes(s.id));
          const isBlocked = blocked.includes(s.id);
          const Icon = isCompleted ? Check : s.icon;

          return (
            <li key={s.id} className="flex items-center gap-1 shrink-0">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  isCurrent && "border-primary bg-primary/10 text-primary font-medium",
                  isCompleted && !isCurrent && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                  isBlocked && "border-destructive/40 bg-destructive/10 text-destructive",
                  !isCurrent && !isCompleted && !isBlocked && "border-muted text-muted-foreground",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-semibold",
                    isCurrent && "bg-primary text-primary-foreground",
                    isCompleted && !isCurrent && "bg-emerald-500 text-white",
                    isBlocked && "bg-destructive text-destructive-foreground",
                    !isCurrent && !isCompleted && !isBlocked && "bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted && !isCurrent ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.short}</span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "h-px w-3 sm:w-6",
                    i < currentIdx ? "bg-emerald-500/50" : "bg-muted-foreground/20",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Deriva a etapa atual a partir do estado do analyzer (frontend-only).
 */
export function deriveIcfPlantaStep(input: {
  hasResult: boolean;
  isAnalyzing: boolean;
  needsUnitConfirm: boolean;
  needsMissingData: boolean;
  paredesRevisao: number;
  isBlocked: boolean;
  budgetDialogOpen: boolean;
  isCreating: boolean;
}): IcfPlantaStep {
  if (input.budgetDialogOpen) return "orcamento";
  if (input.isCreating) return "orcamento";
  if (!input.hasResult && !input.isAnalyzing) return "upload";
  if (input.isAnalyzing) return "tipo";
  if (input.needsUnitConfirm) return "escala";
  if (input.needsMissingData) return "parametros";
  if (input.paredesRevisao > 0 || input.isBlocked) return "revisao";
  return "quantitativo";
}
