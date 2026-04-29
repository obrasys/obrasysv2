import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlanMeasurement } from "@/types/plan-measurements";
import { suggestBudgetItem } from "@/lib/plan-budget-mapping";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Plus, Link2, Ban, RotateCcw, Unlink } from "lucide-react";

interface Props {
  measurement: PlanMeasurement;
  obraId: string;
}

interface OrcamentoLite { id: string; titulo: string; codigo: string | null; status: string }
interface CapituloLite { id: string; orcamento_id: string; titulo: string; numero: number }
interface ArtigoLite { id: string; capitulo_id: string; descricao: string; unidade: string; quantidade: number; preco_unitario: number }

export function PlanMeasurementBudgetPanel({ measurement, obraId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const suggestion = useMemo(() => suggestBudgetItem(measurement), [measurement]);
  const status = measurement.budget_link_status ?? "not_linked";

  // Orçamentos da obra
  const orcamentosQuery = useQuery({
    queryKey: ["plan-budget-orcamentos-by-obra", obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, titulo, codigo, status")
        .eq("obra_id", obraId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrcamentoLite[];
    },
    enabled: !!obraId && !!user,
  });

  // Linked artigo info (when status = 'linked')
  const linkedArtigoQuery = useQuery({
    queryKey: ["plan-linked-artigo", measurement.budget_artigo_id],
    queryFn: async () => {
      if (!measurement.budget_artigo_id) return null;
      const { data, error } = await supabase
        .from("artigos_orcamento")
        .select("id, descricao, unidade, quantidade, preco_unitario, capitulo_id")
        .eq("id", measurement.budget_artigo_id)
        .maybeSingle();
      if (error) return null;
      return data as ArtigoLite | null;
    },
    enabled: !!measurement.budget_artigo_id,
  });

  // Mutations: update measurement state
  const setLinkStatus = useMutation({
    mutationFn: async (patch: { budget_link_status: string; budget_artigo_id?: string | null }) => {
      const { error } = await supabase
        .from("plan_measurements")
        .update(patch as any)
        .eq("id", measurement.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-measurements", measurement.plan_import_id] });
      queryClient.invalidateQueries({ queryKey: ["plan-linked-artigo"] });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  // ─── Linked / ignored views ───
  if (status === "linked" && measurement.budget_artigo_id) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Orçamento <Badge className="bg-emerald-600 text-white text-[10px] h-4">Ligado</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          {linkedArtigoQuery.data ? (
            <>
              <p className="text-foreground font-medium">{linkedArtigoQuery.data.descricao}</p>
              <p className="text-muted-foreground tabular-nums">
                {linkedArtigoQuery.data.quantidade.toFixed(2)} {linkedArtigoQuery.data.unidade}
                {linkedArtigoQuery.data.preco_unitario > 0 &&
                  ` · ${linkedArtigoQuery.data.preco_unitario.toFixed(2)} €/${linkedArtigoQuery.data.unidade}`}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground italic">A carregar item ligado…</p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => setLinkStatus.mutate({ budget_link_status: "not_linked", budget_artigo_id: null })}
          >
            <Unlink className="w-3 h-3 mr-1" /> Desassociar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "ignored") {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Ban className="w-4 h-4" /> Sugestão ignorada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => setLinkStatus.mutate({ budget_link_status: "not_linked" })}
          >
            <RotateCcw className="w-3 h-3 mr-1" /> Reverter
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── not_linked / suggested view ───
  if (!suggestion) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" /> Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground italic">
            Esta medição precisa de mais dados (intervenção/quantidade) para gerar uma sugestão de orçamento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" /> Orçamento
            <Badge variant="secondary" className="text-[10px] h-4">Sugestão</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-3">
          <div className="rounded-md bg-primary/5 p-2.5 space-y-0.5">
            <p className="font-medium text-foreground">{suggestion.description}</p>
            <p className="text-muted-foreground">
              Capítulo: <span className="text-foreground">{suggestion.capitulo}</span>
            </p>
            <p className="text-muted-foreground tabular-nums">
              Quantidade: <span className="font-bold text-primary">{suggestion.quantity.toFixed(2)}</span> {suggestion.unit}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Button size="sm" className="h-8 text-[11px]" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-3 h-3 mr-1" /> Gerar
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => setShowLinkDialog(true)}>
              <Link2 className="w-3 h-3 mr-1" /> Associar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-[11px]"
              onClick={() => setLinkStatus.mutate({ budget_link_status: "ignored" })}
            >
              <Ban className="w-3 h-3 mr-1" /> Ignorar
            </Button>
          </div>
        </CardContent>
      </Card>

      <CreateBudgetItemDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        measurement={measurement}
        suggestion={suggestion}
        orcamentos={orcamentosQuery.data ?? []}
        onLinked={(artigoId) =>
          setLinkStatus.mutate({ budget_link_status: "linked", budget_artigo_id: artigoId })
        }
      />

      <LinkExistingDialog
        open={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        orcamentos={orcamentosQuery.data ?? []}
        onLinked={(artigoId) =>
          setLinkStatus.mutate({ budget_link_status: "linked", budget_artigo_id: artigoId })
        }
      />
    </>
  );
}

// ─── CreateBudgetItemDialog ───
function CreateBudgetItemDialog({
  open,
  onClose,
  measurement,
  suggestion,
  orcamentos,
  onLinked,
}: {
  open: boolean;
  onClose: () => void;
  measurement: PlanMeasurement;
  suggestion: { capitulo: string; unit: string; description: string; quantity: number };
  orcamentos: OrcamentoLite[];
  onLinked: (artigoId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [orcamentoId, setOrcamentoId] = useState<string>("");
  const [capituloId, setCapituloId] = useState<string>("__new__");
  const [descricao, setDescricao] = useState(suggestion.description);
  const [quantidade, setQuantidade] = useState(String(suggestion.quantity));
  const [precoUnitario, setPrecoUnitario] = useState("0");
  const [saving, setSaving] = useState(false);

  // Pre-select first active orçamento
  useMemo(() => {
    if (!orcamentoId && orcamentos.length > 0) {
      setOrcamentoId(orcamentos[0].id);
    }
  }, [orcamentos, orcamentoId]);

  const capitulosQuery = useQuery({
    queryKey: ["plan-budget-capitulos", orcamentoId],
    queryFn: async () => {
      if (!orcamentoId) return [];
      const { data, error } = await supabase
        .from("capitulos_orcamento")
        .select("id, orcamento_id, titulo, numero")
        .eq("orcamento_id", orcamentoId)
        .order("numero", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CapituloLite[];
    },
    enabled: !!orcamentoId,
  });

  const handleCreate = async () => {
    if (!orcamentoId) {
      toast.error("Selecione um orçamento.");
      return;
    }
    setSaving(true);
    try {
      // Resolve capítulo: create new if needed
      let finalCapituloId = capituloId;
      if (capituloId === "__new__") {
        // Find next ordem
        const ordem = (capitulosQuery.data?.length ?? 0) + 1;
        const { data: newCap, error: capErr } = await supabase
          .from("capitulos_orcamento")
          .insert({
            orcamento_id: orcamentoId,
            titulo: suggestion.capitulo,
            numero: ordem,
            ordem,
          } as any)
          .select("id")
          .single();
        if (capErr) throw capErr;
        finalCapituloId = newCap.id;
      }

      const qty = parseFloat(quantidade) || 0;
      const pu = parseFloat(precoUnitario) || 0;
      const ordemArt = ((capitulosQuery.data ?? []).find((c) => c.id === finalCapituloId)?.numero ?? 1) * 100 + 1;

      const { data: artigo, error: artErr } = await supabase
        .from("artigos_orcamento")
        .insert({
          capitulo_id: finalCapituloId,
          codigo: `PL.${measurement.id.slice(0, 6).toUpperCase()}`,
          descricao,
          unidade: suggestion.unit,
          quantidade: qty,
          preco_unitario: pu,
          preco_base: pu,
          ordem: ordemArt,
          quantity_source: "plan_measurement",
        } as any)
        .select("id")
        .single();
      if (artErr) throw artErr;

      onLinked(artigo.id);
      toast.success("Item de orçamento criado e ligado.");
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      onClose();
    } catch (e: any) {
      toast.error("Erro ao criar item: " + (e.message ?? "desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Gerar item de orçamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Orçamento</Label>
            <Select value={orcamentoId} onValueChange={setOrcamentoId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={orcamentos.length === 0 ? "Sem orçamentos nesta obra" : "Escolher…"} />
              </SelectTrigger>
              <SelectContent>
                {orcamentos.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.codigo ? `${o.codigo} · ` : ""}{o.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {orcamentos.length === 0 && (
              <p className="text-[11px] text-amber-600">Crie primeiro um orçamento para esta obra.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Capítulo</Label>
            <Select value={capituloId} onValueChange={setCapituloId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__new__">+ Criar capítulo "{suggestion.capitulo}"</SelectItem>
                {(capitulosQuery.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.numero}. {c.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="h-9" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade</Label>
              <Input type="number" step="0.01" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unidade</Label>
              <Input value={suggestion.unit} disabled className="h-9 bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Preço (€)</Label>
              <Input type="number" step="0.01" value={precoUnitario} onChange={(e) => setPrecoUnitario(e.target.value)} className="h-9" />
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-2 text-xs flex items-center justify-between">
            <span className="text-muted-foreground">Total estimado</span>
            <span className="font-bold tabular-nums">
              {((parseFloat(quantidade) || 0) * (parseFloat(precoUnitario) || 0)).toFixed(2)} €
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving || !orcamentoId}>
            {saving ? "A criar…" : "Criar item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── LinkExistingDialog ───
function LinkExistingDialog({
  open,
  onClose,
  orcamentos,
  onLinked,
}: {
  open: boolean;
  onClose: () => void;
  orcamentos: OrcamentoLite[];
  onLinked: (artigoId: string) => void;
}) {
  const [orcamentoId, setOrcamentoId] = useState<string>("");
  const [artigoId, setArtigoId] = useState<string>("");

  const artigosQuery = useQuery({
    queryKey: ["plan-link-artigos", orcamentoId],
    queryFn: async () => {
      if (!orcamentoId) return [];
      const { data: caps } = await supabase
        .from("capitulos_orcamento")
        .select("id")
        .eq("orcamento_id", orcamentoId);
      const ids = (caps ?? []).map((c) => c.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("artigos_orcamento")
        .select("id, descricao, unidade, quantidade, preco_unitario, capitulo_id")
        .in("capitulo_id", ids)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ArtigoLite[];
    },
    enabled: !!orcamentoId && open,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Associar a item existente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Orçamento</Label>
            <Select value={orcamentoId} onValueChange={(v) => { setOrcamentoId(v); setArtigoId(""); }}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Escolher…" /></SelectTrigger>
              <SelectContent>
                {orcamentos.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.codigo ? `${o.codigo} · ` : ""}{o.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Artigo</Label>
            <Select value={artigoId} onValueChange={setArtigoId} disabled={!orcamentoId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Escolher artigo…" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {(artigosQuery.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.descricao} ({a.quantidade.toFixed(2)} {a.unidade})
                  </SelectItem>
                ))}
                {(artigosQuery.data ?? []).length === 0 && (
                  <div className="px-2 py-3 text-[11px] text-muted-foreground italic">Sem artigos neste orçamento.</div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => {
              if (artigoId) {
                onLinked(artigoId);
                onClose();
              }
            }}
            disabled={!artigoId}
          >
            Associar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
