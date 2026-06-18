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
    <header className={cn("flex w-full min-w-0 flex-col gap-4 pb-4 md:pb-6", className)}>
      {breadcrumbs ? (
        <div className="min-w-0 truncate text-xs text-text-muted">{breadcrumbs}</div>
      ) : null}
      <div className="flex w-full min-w-0 flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          {eyebrow ? (
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="break-words text-2xl font-bold leading-tight tracking-tight text-text-strong sm:text-3xl md:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-2xl break-words text-sm text-text-muted md:text-base">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end [&>*]:min-w-0 [&>a]:flex-1 [&>button]:flex-1 md:[&>a]:flex-none md:[&>button]:flex-none">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
