import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, AlertTriangle, CheckCircle2, Sparkles, Mail, Ban, FileText } from "lucide-react";
import { useSheetClassification } from "@/hooks/useSheetClassification";
import { useFoundationSuggestion } from "@/hooks/useFoundationSuggestion";
import { hasStructuralProject, SHEET_TYPE_LABEL, FLOOR_LABEL } from "@/lib/plan-sheet-classification";
import { FoundationSuggestionWizard } from "./FoundationSuggestionWizard";
import { toast } from "sonner";

interface Props {
  planImportId: string;
  obraId?: string;
  areaImplantacao?: number;
  perimetroExterior?: number;
}

export function StructureFoundationTab({ planImportId, obraId, areaImplantacao, perimetroExterior }: Props) {
  const { pages } = useSheetClassification(planImportId);
  const { latest } = useFoundationSuggestion(planImportId, obraId);
  const [wizardOpen, setWizardOpen] = useState(false);

  const structural = pages.filter((p) => p.discipline === "estrutura");
  const hasStructure = hasStructuralProject(pages);

  if (hasStructure) {
    return (
      <Card className="rounded-xl border-emerald-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Estrutura e Fundação
            <Badge className="bg-emerald-600 text-white text-[10px]">Encontrada</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="border-emerald-200 bg-emerald-50/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <AlertTitle className="text-xs">Projeto estrutural identificado</AlertTitle>
            <AlertDescription className="text-xs">
              Os quantitativos de fundação, paredes estruturais, lajes, vigas, pilares, armaduras e
              perfis metálicos serão extraídos das folhas de estrutura.
            </AlertDescription>
          </Alert>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Folhas estruturais usadas:</p>
            {structural.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs p-2 rounded border bg-card">
                <FileText className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">Pág. {p.page_number}</span>
                <span className="text-muted-foreground">·</span>
                <span>{p.sheet_title || (p.sheet_type ? SHEET_TYPE_LABEL[p.sheet_type] : "")}</span>
                {p.detected_floor && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {FLOOR_LABEL[p.detected_floor]}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-amber-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4 text-amber-700" />
          Estrutura e Fundação
          <Badge variant="outline" className="border-amber-300 text-amber-800 text-[10px]">Não encontrada</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-700" />
          <AlertTitle className="text-xs">Projeto estrutural não encontrado</AlertTitle>
          <AlertDescription className="text-xs">
            Não foram encontradas folhas de estrutura/fundações neste ficheiro. A Axia pode gerar uma
            sugestão preliminar de fundação ICF baseada na arquitetura, mas <strong>não substitui o
            projeto de estabilidade</strong> e deve ser validada por técnico responsável.
          </AlertDescription>
        </Alert>

        {latest && latest.status === "gerado" && (
          <div className="border rounded-md p-2.5 text-xs space-y-1 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Última sugestão preliminar</span>
              <Badge variant="outline" className="text-[10px]">{latest.result?.items?.length ?? 0} itens</Badge>
            </div>
            <p className="text-muted-foreground">{latest.result?.summary ?? "Gerada pela Axia."}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setWizardOpen(true)} disabled={!obraId}>
            <Sparkles className="w-3 h-3 mr-1" /> Gerar sugestão preliminar
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.info("Pedido de validação técnica registado.")}>
            <Mail className="w-3 h-3 mr-1" /> Enviar pedido de validação
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toast("Estrutura ignorada por agora.")}>
            <Ban className="w-3 h-3 mr-1" /> Ignorar por agora
          </Button>
        </div>
      </CardContent>

      {obraId && (
        <FoundationSuggestionWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          planImportId={planImportId}
          obraId={obraId}
          areaImplantacao={areaImplantacao}
          perimetroExterior={perimetroExterior}
        />
      )}
    </Card>
  );
}
