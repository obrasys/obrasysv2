/**
 * Diálogo de boas-vindas ao módulo ICF.
 * Pergunta ao utilizador se quer iniciar um novo orçamento ICF ou
 * carregar uma configuração anterior.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilePlus2, FolderOpen, Loader2 } from "lucide-react";
import type { IcfConfiguracao } from "@/types/icf";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  configs: IcfConfiguracao[];
  isCreating?: boolean;
  onCreateNew: () => void;
  onLoadExisting: (configId: string) => void;
}

export function IcfWelcomeDialog({
  open,
  onOpenChange,
  configs,
  isCreating,
  onCreateNew,
  onLoadExisting,
}: Props) {
  const [mode, setMode] = useState<"choose" | "load">("choose");
  const [selectedId, setSelectedId] = useState<string>(
    configs.find((c) => c.ativo)?.id ?? configs[0]?.id ?? "",
  );

  const hasPrevious = configs.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setMode("choose");
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Como quer começar?</DialogTitle>
          <DialogDescription>
            {mode === "choose"
              ? "Inicie um novo orçamento ICF ou retome uma configuração anterior."
              : "Escolha a configuração ICF que pretende carregar."}
          </DialogDescription>
        </DialogHeader>

        {mode === "choose" ? (
          <div className="grid gap-3">
            <button
              type="button"
              onClick={onCreateNew}
              disabled={isCreating}
              className="flex items-start gap-3 border rounded-lg p-4 text-left hover:bg-accent transition disabled:opacity-60"
            >
              <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FilePlus2 className="h-4 w-4" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium">Novo orçamento ICF</div>
                <p className="text-xs text-muted-foreground">
                  Cria uma configuração paramétrica em branco.
                </p>
              </div>
            </button>

            <button
              type="button"
              disabled={!hasPrevious}
              onClick={() => setMode("load")}
              className="flex items-start gap-3 border rounded-lg p-4 text-left hover:bg-accent transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="h-9 w-9 rounded-md bg-muted text-foreground flex items-center justify-center shrink-0">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium">
                  Carregar orçamento anterior
                </div>
                <p className="text-xs text-muted-foreground">
                  {hasPrevious
                    ? `Tem ${configs.length} configuração(ões) guardada(s).`
                    : "Ainda não existem configurações guardadas."}
                </p>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar configuração" />
              </SelectTrigger>
              <SelectContent>
                {configs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome ?? `Configuração v${(c as any).versao ?? "?"}`}
                    {c.ativo ? " · ativa" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              A configuração escolhida será ativada para este módulo.
            </p>
          </div>
        )}

        <DialogFooter>
          {mode === "load" ? (
            <>
              <Button variant="outline" onClick={() => setMode("choose")}>
                Voltar
              </Button>
              <Button
                onClick={() => selectedId && onLoadExisting(selectedId)}
                disabled={!selectedId}
              >
                Carregar
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Decidir mais tarde
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
