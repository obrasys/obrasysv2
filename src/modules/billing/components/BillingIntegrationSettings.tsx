import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Info, Loader2, Plug, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  useBillingIntegrations,
  useSaveBillingIntegration,
  useTestBillingConnection,
} from "../hooks/useBillingIntegrations";
import {
  PROVIDER_LABELS,
  type BillingEnvironment,
  type BillingProvider,
} from "../types";

const PROVIDERS: BillingProvider[] = [
  "manual_export",
  "keyinvoice",
  "invoicexpress",
  "moloni",
  "vendus",
];

const CREDENTIAL_FIELDS: Record<BillingProvider, Array<{ key: string; label: string; type?: string }>> = {
  manual_export: [],
  keyinvoice: [
    { key: "api_key", label: "API Key (KeyInvoice → Definições → API)", type: "password" },
    { key: "default_product_id", label: "IdProduct genérico (obrigatório p/ linhas)" },
    { key: "doc_series", label: "Série de documento (opcional)" },
  ],
  invoicexpress: [
    { key: "api_key", label: "API Key", type: "password" },
    { key: "account_name", label: "Account name" },
  ],
  moloni: [
    { key: "access_token", label: "Access Token", type: "password" },
    { key: "refresh_token", label: "Refresh Token", type: "password" },
    { key: "client_id", label: "Client ID" },
    { key: "client_secret", label: "Client Secret", type: "password" },
  ],
  vendus: [{ key: "api_key", label: "API Key", type: "password" }],
};

export function BillingIntegrationSettings() {
  const { data: integrations, isLoading } = useBillingIntegrations();
  const save = useSaveBillingIntegration();
  const test = useTestBillingConnection();

  const [provider, setProvider] = useState<BillingProvider>("manual_export");
  const [environment, setEnvironment] = useState<BillingEnvironment>("sandbox");
  const [name, setName] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [accountId, setAccountId] = useState("");
  const [orgExt, setOrgExt] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [prodConfirmed, setProdConfirmed] = useState(false);

  const isProduction = environment === "production";
  const canSave = !save.isPending && (!isProduction || prodConfirmed);

  const fields = CREDENTIAL_FIELDS[provider];

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        provider,
        environment,
        name: name || PROVIDER_LABELS[provider],
        api_base_url: apiBaseUrl || undefined,
        account_id: accountId || undefined,
        organization_external_id: orgExt || undefined,
        credentials: fields.length ? credentials : undefined,
      });
      toast.success("Integração guardada");
      setCredentials({});
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao guardar");
    }
  };

  const handleTest = async (id: string) => {
    try {
      const res: any = await test.mutateAsync(id);
      if (res?.status === "ok") toast.success("Ligação OK");
      else if (res?.status === "not_configured") toast.info("Sem credenciais configuradas");
      else toast.warning(res?.message ?? "Resposta inesperada");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao testar");
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          O Obra Sys <b>não emite faturação fiscal própria</b>. A emissão fiscal oficial é feita
          pelo provider externo configurado. As credenciais são guardadas encriptadas e nunca
          ficam acessíveis ao frontend.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" /> Nova integração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as BillingProvider)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ambiente da integração</Label>
              <Select value={environment} onValueChange={(v) => { setEnvironment(v as BillingEnvironment); setProdConfirmed(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox / Testes</SelectItem>
                  <SelectItem value="production">Produção / Real</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                <b>Sandbox</b> é um ambiente de testes. Permite validar ligação, clientes, documentos, PDFs e sincronização sem criar documentos fiscais reais.
                <br />
                <b>Produção</b> é o ambiente real. Documentos emitidos neste modo podem criar faturas, recibos ou notas de crédito oficiais no provider externo.
              </p>
            </div>
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={PROVIDER_LABELS[provider]} />
            </div>
            <div>
              <Label>API base URL (opcional)</Label>
              <Input value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} />
            </div>
            <div>
              <Label>Account ID (opcional)</Label>
              <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} />
            </div>
            <div>
              <Label>Organization External ID (opcional)</Label>
              <Input value={orgExt} onChange={(e) => setOrgExt(e.target.value)} />
            </div>
          </div>

          {environment === "sandbox" ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Modo Sandbox ativo</AlertTitle>
              <AlertDescription className="text-sm">
                Esta integração está em ambiente de testes. Os documentos enviados para o provider são apenas para validação técnica e não devem ser tratados como documentos fiscais reais.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção: Modo Produção</AlertTitle>
              <AlertDescription className="text-sm">
                Este ambiente pode emitir documentos fiscais reais no provider externo configurado. Antes de ativar produção, confirme que:
                <ul className="list-disc pl-5 mt-2 space-y-0.5">
                  <li>as credenciais são reais;</li>
                  <li>o provider está correto;</li>
                  <li>a empresa/NIF está correto;</li>
                  <li>os testes em sandbox foram concluídos;</li>
                  <li>apenas utilizadores autorizados têm permissão para emitir documentos.</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {fields.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Credenciais (write-only, guardadas no cofre)
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {fields.map((f) => (
                  <div key={f.key}>
                    <Label>{f.label}</Label>
                    <Input
                      type={f.type ?? "text"}
                      autoComplete="off"
                      value={credentials[f.key] ?? ""}
                      onChange={(e) =>
                        setCredentials((c) => ({ ...c, [f.key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {isProduction && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <Checkbox
                id="prod-confirm"
                checked={prodConfirmed}
                onCheckedChange={(c) => setProdConfirmed(c === true)}
                className="mt-0.5"
              />
              <Label htmlFor="prod-confirm" className="text-sm font-normal leading-relaxed cursor-pointer">
                Confirmo que compreendo que o ambiente de Produção pode emitir documentos fiscais reais no provider externo.
              </Label>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!canSave}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar integração
            </Button>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrações configuradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (integrations ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sem integrações configuradas.
            </p>
          ) : (
            <div className="space-y-2">
              {integrations!.map((it) => (
                <div
                  key={it.id ?? ""}
                  className="flex items-center justify-between border rounded-lg p-3 flex-wrap gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{it.name}</span>
                      <Badge variant="outline">
                        {it.provider ? PROVIDER_LABELS[it.provider] : "—"}
                      </Badge>
                      <Badge variant="outline">{it.environment}</Badge>
                      <Badge
                        variant="outline"
                        className={
                          it.status === "active" || it.status === "configured"
                            ? "bg-emerald-50 text-emerald-700"
                            : it.status === "error"
                              ? "bg-red-50 text-red-700"
                              : "bg-muted"
                        }
                      >
                        {it.status}
                      </Badge>
                      {it.has_credentials && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          credenciais ok
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {it.last_connection_test_at
                        ? `Último teste: ${format(new Date(it.last_connection_test_at), "dd/MM/yyyy HH:mm")}`
                        : "Nunca testado"}
                      {it.token_expires_at &&
                        ` · Token expira: ${format(new Date(it.token_expires_at), "dd/MM/yyyy")}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => it.id && handleTest(it.id)}
                    disabled={test.isPending}
                  >
                    Testar ligação
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
