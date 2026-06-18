import { ReactNode } from "react";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  trend?: { value: string; direction: "up" | "down" | "neutral" };
  tone?: "default" | "primary" | "success" | "warning" | "destructive";
  className?: string;
}

const toneClasses: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "bg-surface-elevated",
  primary: "bg-gradient-to-br from-primary/[0.04] to-surface-elevated",
  success: "bg-gradient-to-br from-[hsl(var(--success))]/[0.06] to-surface-elevated",
  warning: "bg-gradient-to-br from-[hsl(var(--warning))]/[0.06] to-surface-elevated",
  destructive: "bg-gradient-to-br from-destructive/[0.06] to-surface-elevated",
};

const toneIcon: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "bg-muted text-text-muted",
  primary: "bg-primary/10 text-primary",
  success: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  warning: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  destructive: "bg-destructive/10 text-destructive",
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  tone = "default",
  className,
}: MetricCardProps) {
  const TrendIcon = trend?.direction === "down" ? TrendingDown : TrendingUp;
  const trendColor =
    trend?.direction === "down"
      ? "text-destructive"
      : trend?.direction === "up"
      ? "text-[hsl(var(--success))]"
      : "text-text-muted";

  return (
    <div
      className={cn(
        "group rounded-2xl border border-border-subtle p-5 shadow-card transition-shadow hover:shadow-card-hover",
        toneClasses[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
        {Icon ? (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", toneIcon[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-text-strong md:text-3xl">
        {value}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {trend ? (
          <span className={cn("inline-flex items-center gap-1 font-medium", trendColor)}>
            <TrendIcon className="h-3 w-3" />
            {trend.value}
          </span>
        ) : null}
        {hint ? <span className="text-text-muted">{hint}</span> : null}
      </div>
    </div>
  );
}

interface MetricCardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const colsClass: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  6: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
};

export function MetricCardGrid({ children, columns = 4, className }: MetricCardGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 md:gap-4", colsClass[columns], className)}>
      {children}
    </div>
  );
}
