import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
}

/**
 * Standard surface card for content sections. Header is optional.
 * Use as a building block for tables, panels, forms.
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  padded = true,
}: SectionCardProps) {
  const hasHeader = title || description || actions;
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border-subtle bg-surface-elevated shadow-card",
        className,
      )}
    >
      {hasHeader ? (
        <header className="flex flex-col gap-2 border-b border-border-subtle px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-base font-semibold text-text-strong">{title}</h2>
            ) : null}
            {description ? (
              <p className="text-sm text-text-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn(padded ? "p-5" : "", bodyClassName)}>{children}</div>
    </section>
  );
}
