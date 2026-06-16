import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Info, Settings, FilePlus2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BillingDocumentsList } from "@/modules/billing/components/BillingDocumentsList";
import { BillingSyncLogsPanel } from "@/modules/billing/components/BillingSyncLogsPanel";
import { useBillingIntegrations } from "@/modules/billing/hooks/useBillingIntegrations";

export function ObraFaturacaoTab({ obraId }: { obraId: string }) {
  const qc = useQueryClient();
  const { data: integrations } = useBillingIntegrations();
  const activeIntegrations = (integrations ?? []).filter((i) => i.is_active);
  const hasActive = activeIntegrations.length > 0;

  const [open, setOpen] = useState(false);
  const [autoId, setAutoId] = useState<string>("");
  const [integrationId, setIntegrationId] = useState<string>("");

  const { data: autos } = useQuery({
    queryKey: ["obra-autos-medicao-faturaveis", obraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autos_medicao")
        .select("id, numero_auto, codigo_referencia, estado, valor_total_com_iva, data_emissao")
        .eq("obra_id", obraId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const prepare = useMutation({
    mutationFn: async (input: { auto_id: string; integration_id: string }) => {
      const { data, error } = await supabase.functions.invoke(
        "billing-prepare-from-auto",
        { body: { ...input, document_type: "invoice" } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-documents"] });
      toast.success("Fatura preparada. Reveja e emita.");
      setOpen(false);
      setAutoId("");
    },
    onError: (e: any) => {
      const msg = e?.context?.error?.message ?? e?.message ?? "Erro ao preparar";
      toast.error(msg);
    },
  });

  const openDialog = () => {
    if (activeIntegrations.length === 1) setIntegrationId(activeIntegrations[0].id);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          O Obra Sys <b>não emite faturação fiscal própria</b>. A emissão é efetuada pelo
          provider externo configurado nas Definições da Empresa. A fatura é gerada a
          partir de um Auto de Medição (ou Folha de Fecho) e depois emitida no provider.
        </AlertDescription>
      </Alert>

      {!hasActive ? (
        <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/30">
          <span className="text-sm text-muted-foreground">
            Não existe integração de faturação ativa.
          </span>
          <Button asChild size="sm" variant="outline">
            <Link to="/empresa/definicoes/faturacao">
              <Settings className="h-4 w-4 mr-2" /> Configurar
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button size="sm" onClick={openDialog}>
            <FilePlus2 className="h-4 w-4 mr-2" />
            Preparar Fatura a partir de Auto
          </Button>
        </div>
      )}

      <BillingDocumentsList obraId={obraId} />
      <BillingSyncLogsPanel />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preparar Fatura</DialogTitle>
            <DialogDescription>
              Selecione um Auto de Medição com itens medidos. A fatura será criada em
              estado <b>pronta</b> para revisão e posterior emissão no provider.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Auto de Medição</Label>
              <Select value={autoId} onValueChange={setAutoId}>
                <SelectTrigger><SelectValue placeholder="Escolha o auto..." /></SelectTrigger>
                <SelectContent>
                  {(autos ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      Auto nº {a.numero_auto}
                      {a.codigo_referencia ? ` · ${a.codigo_referencia}` : ""}
                      {" · "}{a.estado}
                      {" · "}€{Number(a.valor_total_com_iva ?? 0).toFixed(2)}
                    </SelectItem>
                  ))}
                  {(!autos || autos.length === 0) && (
                    <div className="px-2 py-3 text-xs text-muted-foreground">
                      Nenhum auto encontrado nesta obra.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Integração de Faturação</Label>
              <Select value={integrationId} onValueChange={setIntegrationId}>
                <SelectTrigger><SelectValue placeholder="Escolha a integração..." /></SelectTrigger>
                <SelectContent>
                  {activeIntegrations.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.provider} · {i.environment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => prepare.mutate({ auto_id: autoId, integration_id: integrationId })}
              disabled={!autoId || !integrationId || prepare.isPending}
            >
              {prepare.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Preparar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
