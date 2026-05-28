import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as pdfjs from "pdfjs-dist";
import type { SpecialtyPlan } from "@/types/especialidades";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface Props {
  plan: SpecialtyPlan;
}

interface AnalysisResult {
  success: boolean;
  analysis?: {
    detected_symbols?: any[];
    estimated_quantities?: any[];
    warnings?: string[];
    missing_information?: string[];
    overall_confidence?: number;
    review_required?: boolean;
    summary?: string;
  };
  elements_inserted?: number;
  error?: { message: string; code?: string };
}

async function fileToJpegBase64(plan: SpecialtyPlan): Promise<string> {
  const { data: signed } = await supabase.storage
    .from("plan-files")
    .createSignedUrl(plan.file_path, 60 * 5);
  if (!signed?.signedUrl) throw new Error("Não foi possível obter a planta.");

  const isPdf = plan.file_type === "pdf";

  if (isPdf) {
    const loadingTask = pdfjs.getDocument(signed.signedUrl);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível.");
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
  }

  // Imagem direta - desenhar num canvas para reduzir/normalizar
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Falha ao carregar imagem."));
    i.src = signed.signedUrl;
  });
  const maxDim = 2400;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

export function SpecialtyAxiaAnalysis({ plan }: Props) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const run = async () => {
    if (!session?.access_token) {
      toast.error("Sessão expirada - refaça login.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      toast.info("A preparar a planta para análise…");
      const image_base64 = await fileToJpegBase64(plan);

      const { data, error } = await supabase.functions.invoke("axia-specialty-vision", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          image_base64,
          specialty_plan_id: plan.id,
          specialty_type: plan.specialty_type,
          floor_level: plan.floor_level,
          calibration_info: plan.calibration_data ?? null,
          page_number: 1,
        },
      });

      if (error) throw error;
      const r = data as AnalysisResult;
      setResult(r);

      if (r.success) {
        toast.success(`Axia detetou ${r.elements_inserted ?? 0} símbolo(s).`);
        qc.invalidateQueries({ queryKey: ["specialty-elements", plan.id] });
        qc.invalidateQueries({ queryKey: ["specialty-plan", plan.id] });
        qc.invalidateQueries({ queryKey: ["specialty-plans", plan.obra_id] });
      } else {
        toast.warning(r.error?.message ?? "A Axia não conseguiu analisar esta planta.");
      }
    } catch (e: any) {
      console.error("[axia-specialty] erro:", e);
      const msg = e?.message || e?.error?.message || "Erro inesperado.";
      toast.error("Falha na análise: " + msg);
      setResult({ success: false, error: { message: msg } });
    } finally {
      setLoading(false);
    }
  };

  const a = result?.analysis;

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Análise automática (Axia)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          A Axia analisa a planta, identifica símbolos da especialidade e adiciona-os
          como elementos por confirmar.
        </p>
        <Button onClick={run} disabled={loading} className="w-full" size="sm">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />A analisar…</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />Analisar com Axia</>
          )}
        </Button>

        {result && !result.success && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Não foi possível analisar</AlertTitle>
            <AlertDescription className="text-xs">
              {result.error?.message ?? "Tente novamente com melhor qualidade de imagem."}
            </AlertDescription>
          </Alert>
        )}

        {result?.success && a && (
          <div className="space-y-2">
            <Alert>
              <CheckCircle2 className="w-4 h-4" />
              <AlertTitle className="text-xs">
                {result.elements_inserted ?? 0} símbolo(s) detetado(s) · confiança{" "}
                {Math.round((a.overall_confidence ?? 0) * 100)}%
              </AlertTitle>
              {a.summary && <AlertDescription className="text-xs">{a.summary}</AlertDescription>}
            </Alert>

            {a.review_required && (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle className="text-xs">Revisão necessária</AlertTitle>
                <AlertDescription className="text-xs">
                  A Axia indicou pontos a confirmar. Reveja os elementos no painel da direita.
                </AlertDescription>
              </Alert>
            )}

            {a.warnings && a.warnings.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <strong>Avisos:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {a.warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {a.missing_information && a.missing_information.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <strong>Em falta:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {a.missing_information.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
