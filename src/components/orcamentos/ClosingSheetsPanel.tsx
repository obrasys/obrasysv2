import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileCheck2, FileText, AlertTriangle, Lock } from "lucide-react";
import { useClosingSheets } from "@/hooks/useClosingSheets";
import { useGenerateFinalClosing } from "@/hooks/useObraPurchases";
import { useApproveBaseDryBudget } from "@/hooks/useBudgetVersions";
import { ClosingSheetFullView } from "./ClosingSheetFullView";
import { ClosingSheetComparison } from "./ClosingSheetComparison";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";



export function ClosingSheetsPanel({ orcamentoId }: { orcamentoId: string }) {
  const { data: sheets = [], isLoading } = useClosingSheets(orcamentoId);
  const generateFinal = useGenerateFinalClosing();
  const approveBase = useApproveBaseDryBudget();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [creatingObra, setCreatingObra] = useState(false);

  const handleApproveBase = async () => {
    if (!user?.id) return;
    try {
      setCreatingObra(true);

      // 1) Fetch orcamento to check if it already has an obra linked
      const { data: orc, error: orcErr } = await supabase
        .from("orcamentos")
        .select("id, titulo, obra_id, cliente_id, valor_total, status")
        .eq("id", orcamentoId)
        .single();
      if (orcErr) throw orcErr;

      // 2) Approve base (locks budget + creates initial closing sheet + Budget Objetivo v1)
      await approveBase.mutateAsync(orcamentoId);

      // 3) If no obra is linked yet, create one automatically (promotor flow)
      let obraId = orc.obra_id as string | null;
      if (!obraId) {
        const { data: novaObra, error: obraErr } = await supabase
          .from("obras")
          .insert({
            user_id: user.id,
            nome: orc.titulo,
            cliente: (orc as any).cliente ?? null,
            cliente_id: (orc as any).cliente_id ?? null,
            status: "planeamento",
            valor_previsto: orc.valor_total ?? 0,
          })
          .select()
          .single();
        if (obraErr) throw obraErr;
        obraId = novaObra.id;
        await supabase.from("orcamentos").update({ obra_id: obraId }).eq("id", orcamentoId);
      }

      // 4) Mark budget as adjudicated so MCE (compras/adjudicações) is unlocked
      if (orc.status !== "adjudicado") {
        await supabase.from("orcamentos").update({ status: "adjudicado" }).eq("id", orcamentoId);
      }

      qc.invalidateQueries({ queryKey: ["orcamento", orcamentoId] });
      qc.invalidateQueries({ queryKey: ["obras"] });

      toast({
        title: "Folha de Fecho Base criada",
        description: "Obra criada e orçamento pronto para compras e adjudicações no MCE.",
      });

      if (obraId) navigate(`/obras/${obraId}/orcamento-rai`);
    } catch (e: any) {
      toast({
        title: "Erro ao criar Folha de Fecho Base",
        description: e?.message ?? "Não foi possível concluir o fecho base.",
        variant: "destructive",
      });
    } finally {
      setCreatingObra(false);
    }
  };

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
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Crie a <strong>Folha de Fecho Base</strong> para bloquear este orçamento e
            torná-lo a referência oficial. A partir daí, todos os pacotes seguem pelo fluxo
            MCE e a <strong>Folha de Fecho Final</strong> é consolidada no fecho da obra.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="gap-2" disabled={approveBase.isPending || creatingObra}>
                {approveBase.isPending || creatingObra
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Lock className="h-4 w-4" />}
                Criar Folha de Fecho Base
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Criar Folha de Fecho Base?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação <strong>bloqueia o orçamento</strong>, cria a Folha de Fecho Base
                  como referência oficial e a v1 do Budget Objetivo. Se ainda não existir,
                  é também criada automaticamente a <strong>Obra</strong> ligada a este
                  orçamento, libertando o fluxo MCE para compras e adjudicações. Não pode
                  ser revertida.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => approveBase.mutate(orcamentoId)}>
                  Confirmar e bloquear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
