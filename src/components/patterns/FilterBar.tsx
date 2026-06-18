import { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  children?: ReactNode;
  right?: ReactNode;
  className?: string;
}

/**
 * Toolbar for list pages: optional search input on the left, filter controls
 * in the middle, secondary actions on the right.
 */
export function FilterBar({ search, children, right, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-elevated p-3 shadow-card md:flex-row md:items-center",
        className,
      )}
    >
      {search ? (
        <div className="relative flex-1 md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Pesquisar…"}
            className="h-9 pl-9"
          />
        </div>
      ) : null}
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
      {right ? <div className="md:ml-auto flex flex-wrap items-center gap-2">{right}</div> : null}
    </div>
  );
}
