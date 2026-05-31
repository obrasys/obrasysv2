import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CapituloFormData } from "@/types/orcamentos";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nextNumero: number;
  initial?: { numero: number; titulo: string; descricao?: string } | null;
  onSubmit: (data: CapituloFormData) => Promise<void> | void;
  saving?: boolean;
}

export function BudgetChapterFormDialog({ open, onOpenChange, nextNumero, initial, onSubmit, saving }: Props) {
  const [numero, setNumero] = useState<number>(nextNumero);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (!open) return;
    setNumero(initial?.numero ?? nextNumero);
    setTitulo(initial?.titulo ?? "");
    setDescricao(initial?.descricao ?? "");
  }, [open, initial, nextNumero]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar capítulo" : "Adicionar capítulo ao Budget"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <Label>Nº</Label>
              <Input type="number" value={numero} onChange={(e) => setNumero(parseInt(e.target.value || "1", 10))} />
            </div>
            <div className="col-span-3">
              <Label>Título</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button
            onClick={() => titulo.trim() && onSubmit({ numero, titulo: titulo.trim(), descricao })}
            disabled={saving || !titulo.trim()}
          >
            {saving ? "A gravar…" : initial ? "Guardar" : "Adicionar capítulo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
