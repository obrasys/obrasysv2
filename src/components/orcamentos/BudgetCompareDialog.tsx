import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  baseId: string;
  versionId: string;
  versionLabel: string;
}

const fmtEUR = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v ?? 0);

async function loadItems(orcamentoId: string) {
  const { data: caps, error } = await supabase
    .from("capitulos_orcamento")
    .select("id, titulo, numero, valor_total, artigos:artigos_orcamento(id, codigo, descricao, quantidade, preco_unitario, valor_total)")
    .eq("orcamento_id", orcamentoId);
  if (error) throw error;
  return caps ?? [];
}

export function BudgetCompareDialog({ open, onOpenChange, baseId, versionId, versionLabel }: Props) {
  const baseQ = useQuery({
    queryKey: ["budget-compare-items", baseId],
    enabled: open && !!baseId,
    queryFn: () => loadItems(baseId),
  });
  const verQ = useQuery({
    queryKey: ["budget-compare-items", versionId],
    enabled: open && !!versionId,
    queryFn: () => loadItems(versionId),
  });

  const loading = baseQ.isLoading || verQ.isLoading;

  const baseItems = new Map<string, { code: string; desc: string; total: number; qty: number; pu: number }>();
  (baseQ.data ?? []).forEach((c: any) =>
    (c.artigos ?? []).forEach((a: any) => {
      const key = (a.codigo || a.descricao || "").trim().toLowerCase();
      if (!key) return;
      baseItems.set(key, {
        code: a.codigo || "—",
        desc: a.descricao,
        total: Number(a.valor_total ?? 0),
        qty: Number(a.quantidade ?? 0),
        pu: Number(a.preco_unitario ?? 0),
      });
    }),
  );

  const verItems = new Map<string, { code: string; desc: string; total: number; qty: number; pu: number }>();
  (verQ.data ?? []).forEach((c: any) =>
    (c.artigos ?? []).forEach((a: any) => {
      const key = (a.codigo || a.descricao || "").trim().toLowerCase();
      if (!key) return;
      verItems.set(key, {
        code: a.codigo || "—",
        desc: a.descricao,
        total: Number(a.valor_total ?? 0),
        qty: Number(a.quantidade ?? 0),
        pu: Number(a.preco_unitario ?? 0),
      });
    }),
  );

  const totalBase = [...baseItems.values()].reduce((s, x) => s + x.total, 0);
  const totalVer = [...verItems.values()].reduce((s, x) => s + x.total, 0);
  const diff = totalVer - totalBase;
  const diffPct = totalBase > 0 ? (diff / totalBase) * 100 : 0;

  const added: any[] = [];
  const removed: any[] = [];
  const modified: any[] = [];
  verItems.forEach((v, k) => {
    const b = baseItems.get(k);
    if (!b) added.push({ ...v });
    else if (b.total !== v.total) modified.push({ ...v, base: b.total, delta: v.total - b.total });
  });
  baseItems.forEach((b, k) => {
    if (!verItems.has(k)) removed.push({ ...b });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Comparar {versionLabel} com Orçamento Base</DialogTitle>
          <DialogDescription>
            Análise de diferenças entre a versão e o Orçamento Base bloqueado.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <KPI label="Total Base" value={fmtEUR(totalBase)} />
              <KPI label={`Total ${versionLabel}`} value={fmtEUR(totalVer)} highlight />
              <KPI
                label="Δ €"
                value={fmtEUR(diff)}
                tone={diff > 0 ? "negative" : diff < 0 ? "positive" : undefined}
              />
              <KPI
                label="Δ %"
                value={`${diffPct.toFixed(1)}%`}
                tone={diff > 0 ? "negative" : diff < 0 ? "positive" : undefined}
              />
            </div>

            <Section title={`Novos artigos (${added.length})`} items={added.map((x) => ({ left: x.code, mid: x.desc, right: fmtEUR(x.total) }))} emptyLabel="Sem novos artigos" />
            <Section title={`Artigos alterados (${modified.length})`} items={modified.map((x) => ({ left: x.code, mid: x.desc, right: `${fmtEUR(x.base)} → ${fmtEUR(x.total)}` }))} emptyLabel="Sem alterações" />
            <Section title={`Artigos removidos (${removed.length})`} items={removed.map((x) => ({ left: x.code, mid: x.desc, right: fmtEUR(x.total) }))} emptyLabel="Sem remoções" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KPI({ label, value, highlight, tone }: { label: string; value: string; highlight?: boolean; tone?: "positive" | "negative" }) {
  const toneClass = tone === "negative" ? "text-rose-600" : tone === "positive" ? "text-emerald-600" : "";
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold ${highlight ? "text-primary" : ""} ${toneClass}`}>{value}</p>
    </div>
  );
}

function Section({ title, items, emptyLabel }: { title: string; items: { left: string; mid: string; right: string }[]; emptyLabel: string }) {
  return (
    <div>
      <p className="text-sm font-semibold mb-1.5">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyLabel}</p>
      ) : (
        <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr_140px] gap-2 px-3 py-1.5 text-xs">
              <span className="font-mono text-muted-foreground truncate">{it.left}</span>
              <span className="truncate">{it.mid}</span>
              <span className="text-right">{it.right}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
