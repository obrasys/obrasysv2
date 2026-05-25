import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileCheck2, Lock, FileText, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useClosingSheets, type ClosingSheet } from "@/hooks/useClosingSheets";
import { useGenerateFinalClosing } from "@/hooks/useObraPurchases";

const formatCurrency = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v ?? 0);

const formatPct = (v: number) => `${(v ?? 0).toFixed(2).replace(".", ",")}%`;

function ClosingCard({ sheet }: { sheet: ClosingSheet }) {
  const isInitial = sheet.closing_type === "initial";
  const isLocked = sheet.status === "locked";

  return (
    <Card className={isInitial ? "border-amber-200" : "border-blue-200"}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isInitial ? (
              <FileText className="h-4 w-4 text-amber-600" />
            ) : (
              <FileCheck2 className="h-4 w-4 text-blue-600" />
            )}
            {isInitial ? "Folha de Fecho Inicial" : "Folha de Fecho Final"}
          </span>
          <div className="flex items-center gap-2">
            {isLocked && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-200">
                <Lock className="h-3 w-3 mr-1" /> Bloqueada
              </Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {sheet.status}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Metric label="Custo direto" value={formatCurrency(sheet.total_direct_cost)} />
          <Metric label="Custo indireto" value={formatCurrency(sheet.total_indirect_cost)} />
          <Metric label="Estaleiro" value={formatCurrency(sheet.site_costs)} />
          <Metric label="Estrutura" value={formatCurrency(sheet.structure_costs)} />
          <Metric label="Contingência" value={formatCurrency(sheet.contingency_amount)} />
          <Metric label="Margem" value={`${formatCurrency(sheet.margin_amount)} (${formatPct(sheet.margin_percent)})`} />
          <Metric label="Preço venda" value={formatCurrency(sheet.sale_price)} highlight />
          <Metric
            label={isInitial ? "Resultado esperado" : "Resultado final"}
            value={formatCurrency(isInitial ? sheet.expected_result : sheet.final_result ?? 0)}
            highlight
            positive={isInitial ? sheet.expected_result >= 0 : (sheet.final_result ?? 0) >= 0}
          />
        </div>
        {sheet.notes && (
          <p className="text-xs text-muted-foreground mt-3 italic">{sheet.notes}</p>
        )}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3 pt-3 border-t">
          <span>
            Criada em {format(new Date(sheet.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
          </span>
          {sheet.locked_at && (
            <span>
              Bloqueada em {format(new Date(sheet.locked_at), "dd/MM/yyyy HH:mm", { locale: pt })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  highlight,
  positive,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`font-semibold ${
          highlight
            ? positive === false
              ? "text-rose-600"
              : "text-primary"
            : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

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
            A <strong>Folha de Fecho Inicial</strong> é gerada automaticamente quando o Orçamento
            Base Seco é aprovado. A <strong>Folha de Fecho Final</strong> é consolidada a partir
            do Budget Objetivo final.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {initial && <ClosingCard sheet={initial} />}
      {final && <ClosingCard sheet={final} />}
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
