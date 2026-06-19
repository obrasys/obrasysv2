import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import type { PlantProcessingLog, PlantReviewLog } from "@/types/planta-leitura";

interface Props {
  logs: PlantProcessingLog[];
  reviews: PlantReviewLog[];
}

export function PlantHistoryList({ logs, reviews }: Props) {
  type Entry = { kind: "log" | "review"; time: string; title: string; detail?: string };
  const entries: Entry[] = [
    ...logs.map((l) => ({
      kind: "log" as const,
      time: l.created_at,
      title: `[${l.step}] ${l.status}`,
      detail: l.message || undefined,
    })),
    ...reviews.map((r) => ({
      kind: "review" as const,
      time: r.created_at,
      title: `Ação humana: ${r.action}`,
      detail: r.notes || undefined,
    })),
  ].sort((a, b) => b.time.localeCompare(a.time));

  if (entries.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground text-center">Sem histórico ainda.</div>;
  }
  return (
    <ol className="space-y-2 text-xs">
      {entries.map((e, i) => (
        <li key={i} className="border-l-2 border-primary/40 pl-3">
          <div className="font-medium">{e.title}</div>
          {e.detail && <div className="text-muted-foreground">{e.detail}</div>}
          <div className="text-muted-foreground/70">
            {formatDistanceToNow(new Date(e.time), { addSuffix: true, locale: pt })}
          </div>
        </li>
      ))}
    </ol>
  );
}
