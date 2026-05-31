import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileCheck2, FileText, AlertTriangle } from "lucide-react";
import { useClosingSheets } from "@/hooks/useClosingSheets";
import { useGenerateFinalClosing } from "@/hooks/useObraPurchases";
import { ClosingSheetFullView } from "./ClosingSheetFullView";
import { ClosingSheetComparison } from "./ClosingSheetComparison";



export function ClosingSheetsPanel({ orcamentoId }: { orcamentoId: string }) {
  const { data: sheets = [], isLoading } = useClosingSheets(orcamentoId);
  const generateFinal = useGenerateFinalClosing();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initial = sheets.find((s) => s.closing_type === "initial");
  const final = sheets.find((s) => s.closing_type === "final");

  const handleGenerate = async () => {
    await generateFinal.mutateAsync({ orcamentoId, notes: notes.trim() || undefined });
    setConfirmOpen(false);
    setNotes("");
  };

  if (!initial && !final) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-semibold mb-1">Sem Folha de Fecho ainda</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            A <strong>Folha de Fecho Base</strong> bloqueia o orçamento e passa a ser a referência
            oficial. A <strong>Folha de Fecho Final</strong> é consolidada a partir do Budget
            Objetivo final.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {initial && final && <ClosingSheetComparison initial={initial} final={final} />}
      {initial && <ClosingSheetFullView sheet={initial} />}
      {final && <ClosingSheetFullView sheet={final} />}
      {!final && initial && (
        <Card className="border-dashed">
          <CardContent className="py-6 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Gerar Folha de Fecho Final</p>
                <p className="text-xs text-muted-foreground">
                  Consolida valores reais (compras, adjudicações) do Budget Objetivo ativo e bloqueia a versão.
                </p>
              </div>
            </div>
            <Button onClick={() => setConfirmOpen(true)} className="gap-2">
              <FileCheck2 className="h-4 w-4" /> Gerar
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar geração da Folha de Fecho Final</DialogTitle>
            <DialogDescription>
              Esta ação bloqueia o Budget Objetivo ativo e cria uma folha consolidada
              final com todos os valores reais. Não pode ser revertida.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Notas (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={generateFinal.isPending}>
              {generateFinal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Gerar e bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
