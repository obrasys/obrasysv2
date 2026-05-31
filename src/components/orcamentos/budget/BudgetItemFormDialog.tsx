import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ArtigoFormData, ArtigoOrcamento } from "@/types/orcamentos";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<ArtigoOrcamento> | null;
  onSubmit: (data: ArtigoFormData) => Promise<void> | void;
  saving?: boolean;
}

const calcPV = (custo: number, margem: number) =>
  margem > 0 && margem < 100 ? +(custo / (1 - margem / 100)).toFixed(2) : +custo.toFixed(2);

export function BudgetItemFormDialog({ open, onOpenChange, initial, onSubmit, saving }: Props) {
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [quantidade, setQuantidade] = useState<number>(1);
  const [precoBase, setPrecoBase] = useState<number>(0);
  const [margem, setMargem] = useState<number>(0);
  const [precoVenda, setPrecoVenda] = useState<number>(0);
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (!open) return;
    setCodigo(initial?.codigo ?? "");
    setDescricao(initial?.descricao ?? "");
    setUnidade(initial?.unidade ?? "un");
    setQuantidade(Number(initial?.quantidade ?? 1));
    const pb = Number(initial?.preco_base ?? initial?.preco_unitario ?? 0);
    const mg = Number(initial?.margem_lucro_artigo ?? 0);
    setPrecoBase(pb);
    setMargem(mg);
    setPrecoVenda(Number(initial?.preco_unitario ?? calcPV(pb, mg)));
    setObs("");
  }, [open, initial]);

  // Sync PV when base/margem changes
  useEffect(() => {
    if (!open) return;
    setPrecoVenda(calcPV(precoBase, margem));
  }, [precoBase, margem, open]);

  const handleSubmit = async () => {
    if (!descricao.trim()) return;
    await onSubmit({
      codigo: codigo || undefined,
      descricao: descricao.trim(),
      unidade: unidade || "un",
      quantidade: Number(quantidade) || 0,
      preco_base: Number(precoBase) || 0,
      margem_lucro_artigo: Number(margem) || 0,
      preco_unitario: Number(precoVenda) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar artigo do Budget" : "Adicionar artigo ao Budget"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3">
            <Label>Código</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="md:col-span-9">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Unidade</Label>
            <Input value={unidade} onChange={(e) => setUnidade(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Quantidade</Label>
            <Input type="number" step="0.01" value={quantidade} onChange={(e) => setQuantidade(parseFloat(e.target.value || "0"))} />
          </div>
          <div className="md:col-span-3">
            <Label>Custo unit. (€)</Label>
            <Input type="number" step="0.01" value={precoBase} onChange={(e) => setPrecoBase(parseFloat(e.target.value || "0"))} />
          </div>
          <div className="md:col-span-2">
            <Label>Margem (%)</Label>
            <Input type="number" step="0.01" value={margem} onChange={(e) => setMargem(parseFloat(e.target.value || "0"))} />
          </div>
          <div className="md:col-span-3">
            <Label>Venda unit. (€)</Label>
            <Input type="number" step="0.01" value={precoVenda} onChange={(e) => setPrecoVenda(parseFloat(e.target.value || "0"))} />
          </div>
          <div className="md:col-span-12">
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !descricao.trim()}>
            {saving ? "A gravar…" : initial?.id ? "Guardar alterações" : "Adicionar artigo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
