/**
 * Fase 8 — Diálogo "Enviar para orçamento" a partir dos quantitativos ICF
 * unificados. Permite criar um novo orçamento ou anexar capítulos a um
 * orçamento existente do utilizador (filtrado pela obra quando aplicável).
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FilePlus2, FileStack } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIcfPlanToBudget } from "@/hooks/useIcfPlanToBudget";
import type { IcfPlantAnalysisResult } from "@/hooks/useIcfPlantAnalysis";
import type {
  IcfUnifiedQuantities,
  IcfUnifiedParams,
} from "@/lib/icf-unified-quantities";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  result: IcfPlantAnalysisResult | null;
  quantities: IcfUnifiedQuantities;
  params: IcfUnifiedParams;
  obraId?: string | null;
  onCreated?: (orcamentoId: string) => void;
}

interface OrcamentoOption {
  id: string;
  titulo: string;
  status: string;
  codigo: string | null;
}

export function IcfPlanToBudgetDialog({
  open,
  onOpenChange,
  result,
  quantities,
  params,
  obraId,
  onCreated,
}: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"new" | "append">("new");
  const [titulo, setTitulo] = useState("");
  const [targetId, setTargetId] = useState<string>("");
  const [orcamentos, setOrcamentos] = useState<OrcamentoOption[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const planToBudget = useIcfPlanToBudget();

  useEffect(() => {
    if (!open) return;
    setTitulo(
      `Orçamento ICF — ${quantities.origem.toUpperCase()} ${new Date().toLocaleDateString("pt-PT")}`,
    );
    if (!user?.id) return;
    setLoadingList(true);
    (async () => {
      let q = supabase
        .from("orcamentos")
        .select("id, titulo, status, codigo")
        .eq("user_id", user.id)
        .neq("status", "adjudicado")
        .order("created_at", { ascending: false })
        .limit(50);
      if (obraId) q = q.eq("obra_id", obraId);
      const { data } = await q;
      setOrcamentos((data ?? []) as OrcamentoOption[]);
      setLoadingList(false);
    })();
  }, [open, user?.id, obraId, quantities.origem]);

  const handleSubmit = () => {
    if (!result) return;
    planToBudget.mutate(
      {
        result,
        quantities,
        params,
        obraId: obraId ?? null,
        mode,
        titulo: mode === "new" ? titulo : undefined,
        targetOrcamentoId: mode === "append" ? targetId : undefined,
      },
      {
        onSuccess: ({ orcamentoId }) => {
          onCreated?.(orcamentoId);
          onOpenChange(false);
        },
      },
    );
  };

  const canSubmit =
    !!result &&
    (mode === "new" ? titulo.trim().length > 0 : targetId.length > 0);

  const t = quantities.totais;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar quantitativos para orçamento</DialogTitle>
          <DialogDescription>
            {t.paredes_total} parede(s) · {t.area_liquida_m2} m² líquidos ·{" "}
            {t.blocos_com_desperdicio} blocos · {t.volume_betao_total_m3} m³ betão
            {t.paredes_revisao > 0 && (
              <span className="ml-1 text-amber-600">
                · {t.paredes_revisao} a rever
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as "new" | "append")}
          className="grid grid-cols-2 gap-2"
        >
          <label className="flex items-start gap-2 border rounded-md p-3 cursor-pointer hover:bg-accent">
            <RadioGroupItem value="new" id="mode-new" className="mt-0.5" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <FilePlus2 className="h-3.5 w-3.5" /> Criar novo
              </div>
              <p className="text-xs text-muted-foreground">
                Gera um orçamento ICF em rascunho.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-2 border rounded-md p-3 cursor-pointer hover:bg-accent">
            <RadioGroupItem value="append" id="mode-append" className="mt-0.5" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <FileStack className="h-3.5 w-3.5" /> Adicionar a existente
              </div>
              <p className="text-xs text-muted-foreground">
                Acrescenta capítulos no final.
              </p>
            </div>
          </label>
        </RadioGroup>

        {mode === "new" ? (
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título do novo orçamento</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Orçamento ICF Moradia X"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Orçamento de destino</Label>
            <Select value={targetId} onValueChange={setTargetId} disabled={loadingList}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingList
                      ? "A carregar…"
                      : orcamentos.length === 0
                        ? "Sem orçamentos disponíveis"
                        : "Selecionar orçamento"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {orcamentos.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.codigo ? `${o.codigo} · ` : ""}
                    {o.titulo}{" "}
                    <span className="text-muted-foreground">({o.status})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Orçamentos adjudicados estão bloqueados para alterações.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || planToBudget.isPending}>
            {planToBudget.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {mode === "new" ? "Criar orçamento" : "Adicionar capítulos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
