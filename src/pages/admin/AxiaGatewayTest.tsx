import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, ShieldAlert, AlertTriangle } from "lucide-react";

const TASK_TYPES = [
  "general",
  "simple_chat",
  "budget_analysis",
  "cost_review",
  "forecast",
  "rai",
  "mce",
  "documents_help",
];

export default function AxiaGatewayTest() {
  const [message, setMessage] = useState("Qual é a margem desta obra?");
  const [taskType, setTaskType] = useState("general");
  const [module, setModule] = useState("obras");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("axia-ai-gateway", {
        body: { message, task_type: taskType, module },
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
    <AdminLayout title="Axia Gateway — Teste Interno">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Axia Gateway — Teste Interno
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Testa o gateway de produção com routing primário + fallback automático. A chave nunca sai do backend.
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle>Pedido</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>task_type</Label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>module</Label>
                <Input value={module} onChange={(e) => setModule(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Mensagem</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
            </div>
            <Button onClick={run} disabled={loading || !message.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Testar Gateway Axia
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
              <details className="text-xs text-muted-foreground" open>
                <summary className="cursor-pointer">Detalhes técnicos (interno)</summary>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">provider: {result.provider_used}</Badge>
                    <Badge variant="outline">model: {result.model_used}</Badge>
                    <Badge variant="outline">task: {result.task_type}</Badge>
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
