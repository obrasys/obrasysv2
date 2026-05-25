import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ShoppingCart, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useBudgetVersions, useBudgetVersionItems } from "@/hooks/useBudgetVersions";
import { useObraPurchases, useRegisterPurchase } from "@/hooks/useObraPurchases";
import { useActiveSuppliers } from "@/hooks/useContractingPackages";

interface Props {
  orcamentoId: string;
  obraId: string | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);

export function PurchasesPanel({ orcamentoId, obraId }: Props) {
  const { data: versions = [] } = useBudgetVersions(orcamentoId);
  const activeTarget = useMemo(
    () => versions.find((v) => v.version_type === "target" && v.status === "active"),
    [versions],
  );
  const { data: items = [] } = useBudgetVersionItems(activeTarget?.id);
  const { data: purchases = [], isLoading } = useObraPurchases({ orcamentoId });
  const { data: suppliers = [] } = useActiveSuppliers();
  const register = useRegisterPurchase();

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [supplierId, setSupplierId] = useState<string>("none");
  const [itemId, setItemId] = useState<string>("none");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  const itemLabel = (id: string | null) => {
    if (!id) return "—";
    const it = items.find((i) => i.id === id);
    return it ? `${it.chapter_code ?? ""} · ${it.description}`.trim() : "—";
  };
  const supplierLabel = (id: string | null) =>
    suppliers.find((s) => s.id === id)?.nome ?? "—";

  const reset = () => {
    setDescription("");
    setTotalAmount("");
    setSupplierId("none");
    setItemId("none");
    setInvoiceNumber("");
    setInvoiceDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
  };

  const handleSave = async () => {
    const amount = Number(totalAmount);
    if (!description.trim() || !isFinite(amount) || amount <= 0) return;
    await register.mutateAsync({
      orcamentoId,
      obraId,
      description: description.trim(),
      totalAmount: amount,
      supplierId: supplierId !== "none" ? supplierId : undefined,
      budgetVersionItemId: itemId !== "none" ? itemId : undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      invoiceDate: invoiceDate || undefined,
      notes: notes.trim() || undefined,
    });
    setOpen(false);
    reset();
  };

  const total = purchases
    .filter((p) => p.status !== "cancelled")
    .reduce((s, p) => s + p.total_amount, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" /> Compras de Obra
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total comprado: <span className="font-medium">{fmt(total)}</span>
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2" disabled={!activeTarget}>
          <Plus className="h-4 w-4" /> Nova compra
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Sem compras registadas.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Fatura</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">
                    {p.invoice_date ?? format(new Date(p.created_at), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-sm">{p.description}</TableCell>
                  <TableCell className="text-sm">{supplierLabel(p.supplier_id)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {itemLabel(p.budget_version_item_id)}
                  </TableCell>
                  <TableCell className="text-xs">{p.invoice_number ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(p.total_amount)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "cancelled" ? "destructive" : "secondary"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registar compra</DialogTitle>
            <DialogDescription>
              A compra atualiza automaticamente o valor real do item no Budget Objetivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Descrição *</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor total (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Data fatura</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fornecedor</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nº fatura</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Item do orçamento (opcional)</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger><SelectValue placeholder="Ligar a um item específico" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem ligação</SelectItem>
                  {items.map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      {it.chapter_code} · {it.description.slice(0, 60)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Se selecionado, atualiza diretamente o valor real desse item.
              </p>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!description.trim() || !totalAmount || register.isPending}>
              {register.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
