import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Plus, CheckCircle2, Loader2, Building2 } from "lucide-react";
import { useBudgetVersions, useBudgetVersionItems } from "@/hooks/useBudgetVersions";
import {
  useContractingPackages,
  useCreateContractingPackage,
  useConfirmAward,
  useActiveSuppliers,
} from "@/hooks/useContractingPackages";

interface Props {
  orcamentoId: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);

const STATUS_BADGE: Record<string, { label: string; variant: any }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  in_quote: { label: "Em cotação", variant: "default" },
  awarded: { label: "Adjudicado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export function ContractingPackagesPanel({ orcamentoId }: Props) {
  const { data: versions = [] } = useBudgetVersions(orcamentoId);
  const activeTarget = useMemo(
    () => versions.find((v) => v.version_type === "target" && v.status === "active"),
    [versions],
  );
  const { data: items = [], isLoading: itemsLoading } = useBudgetVersionItems(activeTarget?.id);
  const { data: packages = [], isLoading: pkgsLoading } = useContractingPackages(orcamentoId);
  const { data: suppliers = [] } = useActiveSuppliers();
  const createPkg = useCreateContractingPackage();
  const award = useConfirmAward();

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pkgName, setPkgName] = useState("");
  const [pkgDesc, setPkgDesc] = useState("");

  const [awardOpen, setAwardOpen] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string>("");
  const [awardedTotal, setAwardedTotal] = useState<string>("");
  const [awardNotes, setAwardNotes] = useState("");

  const supplierName = (id: string | null) =>
    suppliers.find((s) => s.id === id)?.nome ?? "-";

  const openItems = items.filter((it) => it.contracting_status === "open");
  const selectedTotal = items
    .filter((it) => selected.has(it.id))
    .reduce((s, it) => s + (it.target_total || 0), 0);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleCreate = async () => {
    if (!activeTarget || !pkgName.trim() || selected.size === 0) return;
    await createPkg.mutateAsync({
      orcamentoId,
      versionId: activeTarget.id,
      name: pkgName.trim(),
      description: pkgDesc.trim() || undefined,
      itemIds: Array.from(selected),
    });
    setCreateOpen(false);
    setSelected(new Set());
    setPkgName("");
    setPkgDesc("");
  };

  const openAward = (pkgId: string, estimated: number) => {
    setAwardOpen(pkgId);
    setSupplierId("");
    setAwardedTotal(estimated.toFixed(2));
    setAwardNotes("");
  };

  const handleAward = async () => {
    if (!awardOpen || !supplierId || !activeTarget) return;
    const amount = Number(awardedTotal);
    if (!isFinite(amount) || amount <= 0) return;
    await award.mutateAsync({
      orcamentoId,
      versionId: activeTarget.id,
      packageId: awardOpen,
      supplierId,
      awardedTotal: amount,
      notes: awardNotes.trim() || undefined,
    });
    setAwardOpen(null);
  };

  if (!activeTarget) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aprove o Orçamento Base Seco para começar a contratar pacotes.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Pacotes de Contratação
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Agrupe itens do Budget Objetivo ativo e adjudique a fornecedores.
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={openItems.length === 0}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Novo pacote
          </Button>
        </CardHeader>
        <CardContent>
          {pkgsLoading ? (
            <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          ) : packages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sem pacotes criados. Use "Novo pacote" para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pacote</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Estimado</TableHead>
                  <TableHead className="text-right">Adjudicado</TableHead>
                  <TableHead className="text-right">Δ</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((p) => {
                  const delta = (p.awarded_total || 0) - (p.estimated_total || 0);
                  const st = STATUS_BADGE[p.status] ?? STATUS_BADGE.draft;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        {p.description && (
                          <div className="text-xs text-muted-foreground">{p.description}</div>
                        )}
                      </TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell className="text-sm">
                        {p.awarded_supplier_id ? (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {supplierName(p.awarded_supplier_id)}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(p.estimated_total)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.status === "awarded" ? fmt(p.awarded_total) : "-"}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${delta > 0 ? "text-destructive" : delta < 0 ? "text-emerald-600" : ""}`}>
                        {p.status === "awarded" ? fmt(delta) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status !== "awarded" && p.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAward(p.id, p.estimated_total)}
                            className="gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Adjudicar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create package */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo pacote de contratação</DialogTitle>
            <DialogDescription>
              Selecione os itens (abertos) do Budget Objetivo a incluir neste pacote.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome do pacote *</Label>
                <Input value={pkgName} onChange={(e) => setPkgName(e.target.value)} placeholder="Ex: Eletricidade - geral" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={pkgDesc} onChange={(e) => setPkgDesc(e.target.value)} />
              </div>
            </div>

            <div className="border rounded-md max-h-[40vh] overflow-auto">
              {itemsLoading ? (
                <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
              ) : openItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Sem itens abertos para contratar.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Capítulo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openItems.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(it.id)}
                            onCheckedChange={() => toggle(it.id)}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {it.chapter_code} {it.chapter_name}
                        </TableCell>
                        <TableCell className="text-sm">{it.description}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{it.target_quantity}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{fmt(it.target_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{selected.size} itens selecionados</span>
              <span className="font-medium">Estimado: {fmt(selectedTotal)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={!pkgName.trim() || selected.size === 0 || createPkg.isPending}
            >
              {createPkg.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar pacote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm award */}
      <Dialog open={!!awardOpen} onOpenChange={(o) => !o && setAwardOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar adjudicação</DialogTitle>
            <DialogDescription>
              Atribuir o pacote a um fornecedor com valor final negociado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Fornecedor *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor adjudicado (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={awardedTotal}
                onChange={(e) => setAwardedTotal(e.target.value)}
              />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={awardNotes} onChange={(e) => setAwardNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAwardOpen(null)}>Cancelar</Button>
            <Button
              onClick={handleAward}
              disabled={!supplierId || !awardedTotal || award.isPending}
            >
              {award.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar adjudicação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
