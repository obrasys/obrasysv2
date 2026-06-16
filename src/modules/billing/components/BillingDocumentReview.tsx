import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { fmtEUR } from "@/lib/finance";
import { useBillingDocumentLines } from "../hooks/useBillingDocuments";
import { DOCUMENT_TYPE_LABELS, type BillingDocument } from "../types";

interface Props {
  document: BillingDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isIssuing: boolean;
  isManualExport?: boolean;
}

export function BillingDocumentReview({
  document,
  open,
  onOpenChange,
  onConfirm,
  isIssuing,
  isManualExport,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const { data: lines } = useBillingDocumentLines(document?.id);

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Rever {DOCUMENT_TYPE_LABELS[document.document_type]}
          </DialogTitle>
          <DialogDescription>
            Confirme os valores antes de {isManualExport ? "exportar" : "emitir"}. Após emissão,
            o documento fica imutável.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-amber-900 text-sm">
            {isManualExport
              ? "Modo Exportação Manual — não constitui documento fiscal oficial."
              : "A emissão fiscal será efetuada pelo provider externo configurado. O Obra Sys não emite faturação fiscal própria."}
          </AlertDescription>
        </Alert>

        <div className="max-h-[40vh] overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="p-2 text-left">Descrição</th>
                <th className="p-2 text-right">Qtd</th>
                <th className="p-2 text-right">P. Un.</th>
                <th className="p-2 text-right">IVA</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(lines ?? []).map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-2">{l.description}</td>
                  <td className="p-2 text-right">{l.quantity}</td>
                  <td className="p-2 text-right">{fmtEUR(l.unit_price)}</td>
                  <td className="p-2 text-right">{l.tax_rate}%</td>
                  <td className="p-2 text-right">{fmtEUR(l.gross_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Subtotal</div>
          <div className="text-right">{fmtEUR(document.subtotal_net)}</div>
          <div className="text-muted-foreground">IVA</div>
          <div className="text-right">{fmtEUR(document.total_tax)}</div>
          <div className="text-muted-foreground">Retenção</div>
          <div className="text-right">- {fmtEUR(document.total_retention)}</div>
          <div className="font-semibold">Total a pagar</div>
          <div className="text-right font-semibold">{fmtEUR(document.total_payable)}</div>
        </div>

        <div className="flex items-start gap-2 pt-2">
          <Checkbox
            id="confirm-billing"
            checked={confirmed}
            onCheckedChange={(v) => setConfirmed(v === true)}
          />
          <label htmlFor="confirm-billing" className="text-sm leading-tight cursor-pointer">
            Confirmo que revi os valores e quero {isManualExport ? "exportar" : "emitir"} este documento.
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isIssuing}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={!confirmed || isIssuing}>
            {isIssuing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isManualExport ? "Exportar" : "Emitir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
