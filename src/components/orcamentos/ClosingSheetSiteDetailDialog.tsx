import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, Sparkles } from "lucide-react";
import {
  useClosingSheetSiteDetail,
  SITE_CATEGORY_LABELS,
  SITE_CATEGORY_DEFAULTS,
  type SiteDetailCategory,
  type SiteDetailLine,
} from "@/hooks/useClosingSheetSiteDetail";
import { supabase } from "@/integrations/supabase/client";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v ?? 0);

const CATEGORIES: SiteDetailCategory[] = [
  "technical_staff",
  "site_supervisors",
  "team_leaders",
  "utilities",
  "site_equipment",
  "site_guard",
  "site_labor",
  "other_site_costs",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closingSheetId: string;
  readOnly?: boolean;
}

export function ClosingSheetSiteDetailDialog({ open, onOpenChange, closingSheetId, readOnly }: Props) {
  const { list, upsert, remove } = useClosingSheetSiteDetail(closingSheetId);
  const lines = list.data ?? [];
  const [seeding, setSeeding] = useState(false);
  const seededRef = useRef<string | null>(null);

  const grand = lines.reduce((s, l) => s + Number(l.total_amount || 0), 0);

  const seedDefaults = async () => {
    if (!closingSheetId || readOnly || seeding) return;
    setSeeding(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: mem } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userData.user.id)
        .limit(1)
        .maybeSingle();
      if (!mem?.organization_id) return;

      const rows: any[] = [];
      CATEGORIES.forEach((cat) => {
        SITE_CATEGORY_DEFAULTS[cat].forEach((desc, idx) => {
          rows.push({
            closing_sheet_id: closingSheetId,
            organization_id: mem.organization_id,
            category: cat,
            description: desc,
            useful_percent: 1,
            quantity: 1,
            months: 1,
            monthly_cost: 0,
            sort_order: idx,
          });
        });
      });

      if (rows.length > 0) {
        await supabase.from("closing_sheet_site_detail_lines").insert(rows);
        await list.refetch();
      }
    } finally {
      setSeeding(false);
    }
  };

  // Auto-popular com a lista predefinida na primeira abertura de uma folha vazia.
  useEffect(() => {
    if (!open || !closingSheetId || readOnly) return;
    if (list.isLoading) return;
    if (seededRef.current === closingSheetId) return;
    seededRef.current = closingSheetId;
    if ((list.data?.length ?? 0) === 0) {
      seedDefaults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closingSheetId, readOnly, list.isLoading, list.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Discriminação de Gastos de Estaleiro</DialogTitle>
          <DialogDescription>
            Cada linha calcula automaticamente: % útil × quantidade × nº meses × custo/mês.
            O total alimenta o campo &quot;Custos de Estaleiro&quot; da Folha de Fecho.
          </DialogDescription>
          {!readOnly && (
            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={seedDefaults} disabled={seeding} className="gap-2">
                {seeding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Carregar lista predefinida
              </Button>
            </div>
          )}
        </DialogHeader>

        {list.isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {CATEGORIES.map((cat) => {
              const catLines = lines.filter((l) => l.category === cat);
              const subtotal = catLines.reduce((s, l) => s + Number(l.total_amount || 0), 0);
              return (
                <CategoryBlock
                  key={cat}
                  category={cat}
                  lines={catLines}
                  subtotal={subtotal}
                  readOnly={readOnly}
                  onAdd={() =>
                    upsert.mutate({
                      category: cat,
                      description: "Nova linha",
                      useful_percent: 1,
                      quantity: 1,
                      months: 1,
                      monthly_cost: 0,
                      sort_order: catLines.length,
                    })
                  }
                  onUpdate={(payload) => upsert.mutate(payload)}
                  onRemove={(id) => remove.mutate(id)}
                />
              );
            })}

            <div className="flex items-center justify-between bg-primary text-primary-foreground rounded-md px-4 py-3">
              <span className="font-bold uppercase text-sm">Total Estaleiro</span>
              <span className="text-xl font-bold tabular-nums">{fmt(grand)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryBlock({
  category, lines, subtotal, readOnly, onAdd, onUpdate, onRemove,
}: {
  category: SiteDetailCategory;
  lines: SiteDetailLine[];
  subtotal: number;
  readOnly?: boolean;
  onAdd: () => void;
  onUpdate: (payload: Partial<SiteDetailLine> & { id: string }) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between bg-primary/10 border-l-4 border-primary px-3 py-2 rounded-md">
        <h4 className="font-bold text-sm uppercase text-primary">{SITE_CATEGORY_LABELS[category]}</h4>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={onAdd} className="gap-2 h-7">
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="text-xs text-muted-foreground italic px-3">Sem linhas - usa &quot;Adicionar&quot; para começar.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[34%]">Descrição</TableHead>
              <TableHead className="w-[10%] text-right">% Útil</TableHead>
              <TableHead className="w-[10%] text-right">Qtd</TableHead>
              <TableHead className="w-[10%] text-right">Nº Meses</TableHead>
              <TableHead className="w-[14%] text-right">Custo/Mês (€)</TableHead>
              <TableHead className="w-[16%] text-right">Total (€)</TableHead>
              {!readOnly && <TableHead className="w-[40px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <LineRow key={line.id} line={line} readOnly={readOnly} onUpdate={onUpdate} onRemove={onRemove} />
            ))}
            <TableRow className="bg-muted/40 font-semibold">
              <TableCell colSpan={5} className="text-right text-xs">Subtotal</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(subtotal)}</TableCell>
              {!readOnly && <TableCell />}
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function LineRow({
  line, readOnly, onUpdate, onRemove,
}: {
  line: SiteDetailLine;
  readOnly?: boolean;
  onUpdate: (payload: Partial<SiteDetailLine> & { id: string }) => void;
  onRemove: (id: string) => void;
}) {
  // useful_percent é armazenado como fracção (0–1). A UI mostra como percentagem (0–100).
  const [local, setLocal] = useState({
    description: line.description,
    useful_percent_pct: Number(line.useful_percent ?? 1) * 100,
    quantity: Number(line.quantity ?? 1),
    months: Number(line.months ?? 1),
    monthly_cost: Number(line.monthly_cost ?? 0),
  });

  const fraction = (local.useful_percent_pct || 0) / 100;
  const total = fraction * local.quantity * local.months * local.monthly_cost;

  const commit = (patch: Partial<typeof local>) => {
    const next = { ...local, ...patch };
    setLocal(next);
  };

  const save = () => onUpdate({
    id: line.id,
    description: local.description,
    useful_percent: fraction,
    quantity: local.quantity,
    months: local.months,
    monthly_cost: local.monthly_cost,
  });

  return (
    <TableRow>
      <TableCell>
        <Input
          value={local.description}
          readOnly={readOnly}
          onChange={(e) => commit({ description: e.target.value })}
          onBlur={save}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input type="number" step="1" min={0} max={100} value={local.useful_percent_pct} readOnly={readOnly}
          onChange={(e) => commit({ useful_percent_pct: parseFloat(e.target.value || "0") })}
          onBlur={save} className="h-8 text-right" />
      </TableCell>
      <TableCell>
        <Input type="number" step="0.01" value={local.quantity} readOnly={readOnly}
          onChange={(e) => commit({ quantity: parseFloat(e.target.value || "0") })}
          onBlur={save} className="h-8 text-right" />
      </TableCell>
      <TableCell>
        <Input type="number" step="0.01" value={local.months} readOnly={readOnly}
          onChange={(e) => commit({ months: parseFloat(e.target.value || "0") })}
          onBlur={save} className="h-8 text-right" />
      </TableCell>
      <TableCell>
        <Input type="number" step="0.01" value={local.monthly_cost} readOnly={readOnly}
          onChange={(e) => commit({ monthly_cost: parseFloat(e.target.value || "0") })}
          onBlur={save} className="h-8 text-right" />
      </TableCell>
      <TableCell className="text-right tabular-nums font-semibold">{fmt(total)}</TableCell>
      {!readOnly && (
        <TableCell>
          <Button size="icon" variant="ghost" onClick={() => onRemove(line.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}
