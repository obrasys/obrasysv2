import { cn } from "@/lib/utils";

export type WorkflowState =
  | "draft"
  | "review"
  | "approved"
  | "sent"
  | "awarded"
  | "lost"
  | "blocked"
  | "paid"
  | "inprogress"
  | "done"
  | "expired"
  | "pending";

const labels: Record<WorkflowState, string> = {
  draft: "Rascunho",
  review: "Em revisão",
  approved: "Aprovado",
  sent: "Enviado",
  awarded: "Adjudicado",
  lost: "Perdido",
  blocked: "Bloqueado",
  paid: "Pago",
  inprogress: "Em execução",
  done: "Concluído",
  expired: "Expirado",
  pending: "Pendente",
};

interface StatusBadgeProps {
  state: WorkflowState;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Centralized workflow-state pill. Uses semantic tokens --state-*.
 * Always pass a known WorkflowState; defaults to the Portuguese label.
 */
export function StatusBadge({ state, label, size = "sm", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className,
      )}
      style={{
        background: `hsl(var(--state-${state}) / 0.10)`,
        color: `hsl(var(--state-${state}))`,
        borderColor: `hsl(var(--state-${state}) / 0.25)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: `hsl(var(--state-${state}))` }}
      />
      {label ?? labels[state]}
    </span>
  );
}
