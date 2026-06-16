import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, RefreshCw, Download, FileMinus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { fmtEUR } from "@/lib/finance";
import { format } from "date-fns";
import { BillingDocumentStatusBadge } from "./BillingDocumentStatusBadge";
import { BillingDocumentReview } from "./BillingDocumentReview";
import { DOCUMENT_TYPE_LABELS, type BillingDocument } from "../types";
import {
  useBillingDocuments,
  useIssueBillingDocument,
  useSyncBillingDocument,
  useCreateBillingCreditNote,
  useGetBillingDocumentPdf,
} from "../hooks/useBillingDocuments";
import { useBillingIntegrations } from "../hooks/useBillingIntegrations";

const IMMUTABLE: ReadonlyArray<string> = [
  "issued",
  "paid",
  "partially_paid",
  "credited",
  "cancelled",
];

export function BillingDocumentsList({ obraId }: { obraId: string }) {
  const { data: docs, isLoading } = useBillingDocuments(obraId);
  const { data: integrations } = useBillingIntegrations();
  const [reviewing, setReviewing] = useState<BillingDocument | null>(null);

  const issue = useIssueBillingDocument();
  const sync = useSyncBillingDocument();
  const credit = useCreateBillingCreditNote();
  const pdf = useGetBillingDocumentPdf();

  const integrationById = (id: string | null) =>
    integrations?.find((i) => i.id === id);

  const handleIssue = async () => {
    if (!reviewing) return;
    try {
      await issue.mutateAsync(reviewing.id);
      toast.success("Documento emitido");
      setReviewing(null);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao emitir");
    }
  };

  const handleSync = async (id: string) => {
    try {
      await sync.mutateAsync(id);
      toast.success("Estado sincronizado");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao sincronizar");
    }
  };

  const handleCredit = async (id: string) => {
    try {
      await credit.mutateAsync(id);
      toast.success("Nota de crédito criada");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar nota de crédito");
    }
  };

  const handlePdf = async (id: string) => {
    try {
      const res = await pdf.mutateAsync(id);
      if (res?.url) window.open(res.url, "_blank");
      else toast.info("PDF não disponível");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao obter PDF");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!docs || docs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Sem documentos de faturação preparados.</p>
          <p className="text-xs mt-1">
            Prepare a partir de um Auto de Medição, Folha de Fecho ou Orçamento adjudicado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {docs.map((d) => {
          const integration = integrationById(d.integration_id);
          const isManual = integration?.provider === "manual_export";
          const isImmutable = IMMUTABLE.includes(d.internal_status);
          return (
            <Card key={d.id} className="rounded-xl">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">
                      {DOCUMENT_TYPE_LABELS[d.document_type]}
                      {d.external_number ? ` · ${d.external_number}` : ""}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {d.source_type} · rev {d.source_revision} ·{" "}
                      {format(new Date(d.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  <BillingDocumentStatusBadge
                    internalStatus={d.internal_status}
                    externalStatus={d.external_status}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-semibold">{fmtEUR(d.total_payable)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isImmutable && (
                      <Button size="sm" onClick={() => setReviewing(d)}>
                        <Send className="h-3.5 w-3.5 mr-1" />
                        {isManual ? "Exportar" : "Emitir"}
                      </Button>
                    )}
                    {isImmutable && !isManual && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSync(d.id)}
                        disabled={sync.isPending}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Sincronizar
                      </Button>
                    )}
                    {(d.external_pdf_url || isImmutable) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePdf(d.id)}
                        disabled={pdf.isPending}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        PDF
                      </Button>
                    )}
                    {d.internal_status === "issued" && d.document_type === "invoice" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCredit(d.id)}
                        disabled={credit.isPending}
                      >
                        <FileMinus className="h-3.5 w-3.5 mr-1" />
                        Nota Crédito
                      </Button>
                    )}
                    {!isImmutable && d.internal_status === "draft" && (
                      <Button size="sm" variant="ghost" className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <BillingDocumentReview
        document={reviewing}
        open={!!reviewing}
        onOpenChange={(o) => !o && setReviewing(null)}
        onConfirm={handleIssue}
        isIssuing={issue.isPending}
        isManualExport={
          reviewing
            ? integrationById(reviewing.integration_id)?.provider === "manual_export"
            : false
        }
      />
    </>
  );
}
