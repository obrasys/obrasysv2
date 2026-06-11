import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle2, XCircle } from "lucide-react";
import { summarizeClassification, FLOOR_LABEL } from "@/lib/plan-sheet-classification";
import { useSheetClassification } from "@/hooks/useSheetClassification";
import { useFoundationSuggestion } from "@/hooks/useFoundationSuggestion";

interface Props {
  planImportId: string;
  obraId?: string;
}

export function PlanSummaryCard({ planImportId, obraId }: Props) {
  const { pages, isLoading } = useSheetClassification(planImportId);
  const { latest } = useFoundationSuggestion(planImportId, obraId);

  if (isLoading || pages.length === 0) return null;
  const s = summarizeClassification(pages);

  const row = (label: string, ok: boolean) => (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="text-muted-foreground">{label}</span>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground/50" />}
    </div>
  );

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          Resumo do projeto
          <Badge variant="outline" className="ml-auto text-[10px]">
            Conf. média {Math.round(s.overall_confidence * 100)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
        <div className="space-y-0.5">
          <div className="text-xs flex justify-between">
            <span className="text-muted-foreground">Folhas analisadas</span>
            <span className="font-semibold">{s.total}</span>
          </div>
          <div className="text-xs flex justify-between">
            <span className="text-muted-foreground">Arquitetura</span>
            <span className="font-semibold">{s.arquitetura}</span>
          </div>
          <div className="text-xs flex justify-between">
            <span className="text-muted-foreground">Estrutura</span>
            <span className="font-semibold">{s.estrutura}</span>
          </div>
          <div className="text-xs flex justify-between">
            <span className="text-muted-foreground">Pisos identificados</span>
            <span className="font-semibold">
              {s.floors_detected.length > 0
                ? s.floors_detected.map((f) => (FLOOR_LABEL as Record<string, string>)[f] ?? f).join(", ")
                : "—"}
            </span>
          </div>
          {latest?.status === "gerado" && (
            <div className="text-xs flex justify-between">
              <span className="text-muted-foreground">Fundação sugerida</span>
              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-800">Preliminar</Badge>
            </div>
          )}
        </div>
        <div>
          {row("Planta de fundações", s.has_foundation)}
          {row("Estrutural Piso 0", s.has_structural_p0)}
          {row("Estrutural Piso 1", s.has_structural_p1)}
          {row("Armaduras", s.has_reinforcements)}
          {row("Perfis metálicos", s.has_metallic)}
        </div>
      </CardContent>
    </Card>
  );
}
