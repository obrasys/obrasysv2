import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";

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
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Axia × NVIDIA — Teste
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Valida a integração com NVIDIA via Edge Function segura. A API Key nunca sai do backend.
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
              Enviar para NVIDIA
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
              <CardTitle className="flex items-center gap-2">
                Resposta
                <Badge variant="secondary">{result.provider_used}</Badge>
                {result.model_used && <Badge variant="outline">{result.model_used}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
                {result.answer || JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
