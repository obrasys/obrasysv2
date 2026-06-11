import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import {
  hasStructuralProject,
  summarizeClassification,
} from "@/lib/plan-sheet-classification";
import { useSheetClassification } from "@/hooks/useSheetClassification";
import { useFoundationSuggestion } from "@/hooks/useFoundationSuggestion";

interface Props {
  planImportId: string;
  obraId?: string;
}

type AlertEntry = {
  level: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
};

export function PlanAlertsPanel({ planImportId, obraId }: Props) {
  const { pages, isLoading } = useSheetClassification(planImportId);
  const { latest } = useFoundationSuggestion(planImportId, obraId);

  if (isLoading || pages.length === 0) return null;

  const summary = summarizeClassification(pages);
  const hasStructure = hasStructuralProject(pages);
  const alerts: AlertEntry[] = [];

  if (hasStructure) {
    alerts.push({
      level: "success",
      title: "Projeto estrutural identificado",
      message:
        "Os quantitativos de fundação, paredes estruturais, lajes, vigas, pilares, armaduras e perfis metálicos serão extraídos das folhas de estrutura.",
    });
    if (!summary.has_foundation) {
      alerts.push({
        level: "warning",
        title: "Estrutura sem planta de fundações",
        message:
          "Encontrei folhas estruturais mas não identifiquei a planta de fundações. Verifica se está em falta no projeto.",
      });
    }
  } else {
    alerts.push({
      level: "warning",
      title: "Projeto estrutural não encontrado",
      message:
        "A Axia pode gerar uma sugestão preliminar de fundação ICF baseada na arquitetura, mas será marcada como sugestão e exigirá validação técnica.",
    });
  }

  // Diff pisos arquitetura vs estrutura
  const archFloors = new Set(
    pages.filter((p) => p.discipline === "arquitetura").map((p) => p.detected_floor).filter(Boolean),
  );
  const strFloors = new Set(
    pages.filter((p) => p.discipline === "estrutura").map((p) => p.detected_floor).filter(Boolean),
  );
  if (hasStructure && archFloors.size > 0 && strFloors.size > 0) {
    const missing = Array.from(archFloors).filter((f) => !strFloors.has(f as string));
    if (missing.length > 0) {
      alerts.push({
        level: "warning",
        title: "Pisos sem cobertura estrutural",
        message: `Os pisos ${missing.join(", ")} aparecem na arquitetura mas não na estrutura.`,
      });
    }
  }

  // Baixa confiança global
  if (summary.overall_confidence > 0 && summary.overall_confidence < 0.6) {
    alerts.push({
      level: "warning",
      title: "Confiança baixa na classificação",
      message: `Confiança média ${(summary.overall_confidence * 100).toFixed(0)}%. Revê manualmente as folhas no painel "Folhas identificadas".`,
    });
  }

  // Sugestão de fundação ativa sem geotécnico
  if (latest && latest.status === "gerado" && latest.inputs?.tem_estudo_geotecnico === false) {
    alerts.push({
      level: "warning",
      title: "Sugestão de fundação sem estudo geotécnico",
      message:
        "A sugestão preliminar foi gerada sem estudo geotécnico. A validação técnica é obrigatória antes de avançar para orçamento.",
    });
  }

  // Páginas não classificadas
  const unclassified = pages.filter((p) => !p.classified_at).length;
  if (unclassified > 0) {
    alerts.push({
      level: "info",
      title: `${unclassified} página(s) por classificar`,
      message: "Classifica as folhas com a Axia antes de gerar quantitativos.",
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => {
        const Icon =
          a.level === "success" ? CheckCircle2 :
          a.level === "error" ? XCircle :
          a.level === "warning" ? AlertTriangle : Info;
        const cls =
          a.level === "success" ? "border-emerald-200 bg-emerald-50/40" :
          a.level === "error" ? "border-rose-300 bg-rose-50" :
          a.level === "warning" ? "border-amber-300 bg-amber-50" :
          "border-blue-200 bg-blue-50/40";
        const icCls =
          a.level === "success" ? "text-emerald-700" :
          a.level === "error" ? "text-rose-700" :
          a.level === "warning" ? "text-amber-700" : "text-blue-700";
        return (
          <Alert key={i} className={cls}>
            <Icon className={`w-4 h-4 ${icCls}`} />
            <AlertTitle className="text-xs">{a.title}</AlertTitle>
            <AlertDescription className="text-xs">{a.message}</AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
