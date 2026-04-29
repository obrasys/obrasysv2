import { Badge } from "@/components/ui/badge";
import { CheckCircle2, HelpCircle, AlertTriangle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfidenceLevel =
  | "confirmado"
  | "provavel"
  | "precisa_validar"
  | "informacao_em_falta";

export type MeasurementOrigin =
  | "axia_auto"
  | "manual"
  | "derivado"
  | "importado"
  | "ocr";

const CONFIDENCE_CONFIG: Record<
  ConfidenceLevel,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  confirmado: {
    label: "Confirmado",
    icon: CheckCircle2,
    className:
      "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-300 dark:border-emerald-800",
  },
  provavel: {
    label: "Provável",
    icon: HelpCircle,
    className:
      "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-300 dark:border-blue-800",
  },
  precisa_validar: {
    label: "Precisa validar",
    icon: AlertTriangle,
    className:
      "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300 dark:border-amber-800",
  },
  informacao_em_falta: {
    label: "Em falta",
    icon: MinusCircle,
    className:
      "bg-red-500/10 text-red-700 border-red-200 dark:text-red-300 dark:border-red-800",
  },
};

interface ConfidenceBadgeProps {
  level: ConfidenceLevel | string | null | undefined;
  origin?: MeasurementOrigin | string | null;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

export function ConfidenceBadge({
  level,
  origin,
  size = "sm",
  showIcon = true,
  className,
}: ConfidenceBadgeProps) {
  const safeLevel = (level ?? "provavel") as ConfidenceLevel;
  const cfg = CONFIDENCE_CONFIG[safeLevel] ?? CONFIDENCE_CONFIG.provavel;
  const Icon = cfg.icon;
  const isAuto = origin === "axia_auto" || origin === "ocr";

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium",
        size === "sm" ? "text-[10px] px-1.5 py-0 h-5" : "text-xs px-2 py-0.5",
        cfg.className,
        className,
      )}
    >
      {showIcon && <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />}
      <span>{cfg.label}</span>
      {isAuto && <span className="opacity-60">· Axia</span>}
    </Badge>
  );
}

export const CONFIDENCE_OPTIONS: Array<{ value: ConfidenceLevel; label: string }> = [
  { value: "confirmado", label: "Confirmado" },
  { value: "provavel", label: "Provável" },
  { value: "precisa_validar", label: "Precisa validar" },
  { value: "informacao_em_falta", label: "Informação em falta" },
];
