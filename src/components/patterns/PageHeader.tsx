import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  className?: string;
}

/**
 * Standard page header: large title, supporting subtitle, optional eyebrow tag,
 * and a right-aligned actions slot. Use at the top of every main page.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 pb-6", className)}>
      {breadcrumbs ? <div className="text-xs text-text-muted">{breadcrumbs}</div> : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-3xl font-bold tracking-tight text-text-strong md:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-2xl text-sm text-text-muted md:text-base">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
