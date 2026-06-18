import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ShieldAlert, AlertTriangle } from "lucide-react";

export default function AxiaNvidiaTest() {
  const [message, setMessage] = useState("Olá Axia, faz um ping de verificação.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("axia-nvidia-test", {
        body: { message },
      });
      if (error) throw error;
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Axia — Teste Interno">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Axia — Teste Interno
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Valida a resposta da Axia através de uma Edge Function segura. A chave de API nunca sai do backend.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mensagem de teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Escreve uma mensagem para a Axia..."
            />
            <Button onClick={run} disabled={loading || !message.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar para a Axia
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardHeader><CardTitle className="text-destructive">Erro</CardTitle></CardHeader>
            <CardContent><pre className="text-xs whitespace-pre-wrap">{error}</pre></CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <Sparkles className="h-5 w-5 text-primary" /> Axia
                {result.requires_human_review && (
                  <Badge variant="destructive" className="gap-1">
                    <ShieldAlert className="h-3 w-3" /> Requer validação humana
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg leading-relaxed">
                {result.answer || "Sem resposta."}
              </div>
              {Array.isArray(result.warnings) && result.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
                  {result.warnings.map((w: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Metadados técnicos: visíveis apenas nesta página interna/dev, escondidos por defeito */}
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Detalhes técnicos (interno)</summary>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {result.provider_used && <Badge variant="secondary">{result.provider_used}</Badge>}
                    {result.model_used && <Badge variant="outline">{result.model_used}</Badge>}
                  </div>
                  <pre className="p-3 bg-muted/50 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
                </div>
              </details>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
