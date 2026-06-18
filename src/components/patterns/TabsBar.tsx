import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabsBarItem {
  key: string;
  label: ReactNode;
  count?: number;
}

interface TabsBarProps {
  items: TabsBarItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}

/**
 * Horizontal scrollable tab bar with active underline and optional counts.
 * Distinct from shadcn Tabs — used for in-page navigation (filters/sections)
 * without forcing a controlled Tabs content split.
 */
export function TabsBar({ items, value, onChange, className }: TabsBarProps) {
  return (
    <div
      className={cn(
        "scrollbar-hide -mx-2 flex gap-1 overflow-x-auto border-b border-border-subtle px-2",
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "text-primary"
                : "text-text-muted hover:text-text-strong",
            )}
          >
            <span className="inline-flex items-center gap-2">
              {item.label}
              {typeof item.count === "number" ? (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                    active ? "bg-primary/10 text-primary" : "bg-muted text-text-muted",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "absolute inset-x-2 -bottom-px h-[2px] rounded-full transition-opacity",
                active ? "bg-primary opacity-100" : "opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
