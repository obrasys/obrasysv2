import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { BudgetWorkingVersion } from "@/hooks/useBudgetWorkingVersions";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  versions: BudgetWorkingVersion[];
  defaultSourceId?: string;
  loading?: boolean;
  onConfirm: (data: { name: string; sourceId: string; reason: string; notes: string }) => void;
}

export function NewBudgetVersionDialog({
  open,
  onOpenChange,
  versions,
  defaultSourceId,
  loading,
  onConfirm,
}: Props) {
  const [name, setName] = useState("");
  const [sourceId, setSourceId] = useState(defaultSourceId ?? versions[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!sourceId) return;
    onConfirm({ name: name.trim(), sourceId, reason: reason.trim(), notes: notes.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova versão do Budget</DialogTitle>
          <DialogDescription>
            Cria uma cópia independente a partir de uma versão existente. Nada no Orçamento Base é alterado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome da versão</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Reorçamento após visita técnica"
            />
          </div>
          <div>
            <Label>Origem</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar versão de origem" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    V{v.budget_version_number}
                    {v.version_name ? ` · ${v.version_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Motivo do reorçamento</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Alteração de quantidades" />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={loading || !sourceId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar versão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
