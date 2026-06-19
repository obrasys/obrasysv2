import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { exportToBudget } from "@/hooks/usePlantLeitura";
import type { PlantElement, PlantFile } from "@/types/planta-leitura";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  file: PlantFile;
  elements: PlantElement[];
  onExported: (budgetId: string) => void;
}

export function PlantExportToBudgetModal({ open, onOpenChange, file, elements, onExported }: Props) {
  const { toast } = useToast();
  const [target, setTarget] = useState<"new" | "existing">("new");
  const [budgetName, setBudgetName] = useState(`Orçamento Planta — ${file.file_name}`);
  const [budgets, setBudgets] = useState<{ id: string; nome: string }[]>([]);
  const [budgetId, setBudgetId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const approved = elements.filter(e => e.status === "approved");
  const review = elements.filter(e => e.status === "review" || e.status === "proposed");
  const ignored = elements.filter(e => e.status === "ignored");

  useEffect(() => {
    if (!open) return;
    let q = supabase.from("orcamentos").select("id, titulo").order("created_at", { ascending: false }).limit(50);
    if (file.obra_id) q = q.eq("obra_id", file.obra_id);
    q.then(({ data }) => setBudgets(((data as any) || []).map((b: any) => ({ id: b.id, nome: b.titulo }))));
  }, [open, file.obra_id]);

  const submit = async () => {
    if (approved.length === 0) {
      toast({ title: "Sem itens aprovados", description: "Aprove pelo menos um item antes de enviar.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await exportToBudget({
        plant_file_id: file.id,
        obra_id: file.obra_id ?? null,
        target,
        budget_id: target === "existing" ? budgetId : undefined,
        budget_name: target === "new" ? budgetName : undefined,
      });
      toast({ title: "Enviado", description: `${res.items_exported} artigos criados no orçamento.` });
      onExported(res.budget_id);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha no envio.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar quantitativos para orçamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 p-3 text-xs">
            Serão enviados apenas os quantitativos aprovados. Itens em revisão, ignorados ou propostos não serão enviados para o orçamento.
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border p-2"><div className="text-xs text-muted-foreground">Aprovados</div><div className="text-lg font-semibold text-emerald-700">{approved.length}</div></div>
            <div className="rounded-lg border p-2"><div className="text-xs text-muted-foreground">Em revisão</div><div className="text-lg font-semibold text-amber-700">{review.length}</div></div>
            <div className="rounded-lg border p-2"><div className="text-xs text-muted-foreground">Ignorados</div><div className="text-lg font-semibold text-muted-foreground">{ignored.length}</div></div>
          </div>
          <RadioGroup value={target} onValueChange={(v) => setTarget(v as any)} className="space-y-2">
            <div className="flex items-center gap-2"><RadioGroupItem value="new" id="r-new" /><Label htmlFor="r-new">Criar orçamento novo</Label></div>
            {target === "new" && (
              <Input value={budgetName} onChange={(e) => setBudgetName(e.target.value)} placeholder="Nome do orçamento" />
            )}
            <div className="flex items-center gap-2"><RadioGroupItem value="existing" id="r-ex" /><Label htmlFor="r-ex">Adicionar a orçamento existente</Label></div>
            {target === "existing" && (
              <Select value={budgetId} onValueChange={setBudgetId}>
                <SelectTrigger><SelectValue placeholder="Escolher orçamento..." /></SelectTrigger>
                <SelectContent>{budgets.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting || (target === "existing" && !budgetId)}>
            {submitting ? "A enviar..." : "Enviar para orçamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
