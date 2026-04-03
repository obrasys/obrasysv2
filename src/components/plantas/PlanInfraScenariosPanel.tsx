import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Sparkles, Check, ChevronDown, Trash2, AlertTriangle, Package } from "lucide-react";
import { TIPO_FUNDACAO_OPTIONS, type PlanInfraScenario, type PlanInfraItem, type PlanSiteCondition } from "@/types/plan-infra";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  siteCondition: PlanSiteCondition | null;
  scenarios: PlanInfraScenario[];
  items: PlanInfraItem[];
  onSelectScenario: (id: string) => void;
  onDeleteScenario: (id: string) => void;
  onScenariosGenerated: (payload: any) => void;
  isLoading: boolean;
}

export function PlanInfraScenariosPanel({
  siteCondition,
  scenarios,
  items,
  onSelectScenario,
  onDeleteScenario,
  onScenariosGenerated,
  isLoading,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!siteCondition) {
      toast.error("Preencha primeiro as condições do terreno");
      return;
    }
    setGenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Sessão expirada");

      const res = await supabase.functions.invoke("axia-infra-scenarios", {
        body: { site_conditions: siteCondition },
      });

      if (res.error) throw res.error;
      const result = res.data as { scenarios?: any[]; error?: string };
      if (result.error) throw new Error(result.error);
      if (!result.scenarios || result.scenarios.length === 0) {
        toast.info("Axia não gerou cenários para estas condições.");
        return;
      }
      onScenariosGenerated({ scenarios: result.scenarios });
    } catch (err: any) {
      toast.error("Erro ao gerar cenários: " + (err.message || String(err)));
    } finally {
      setGenerating(false);
    }
  };

  const fundacaoLabel = (tipo: string) =>
    TIPO_FUNDACAO_OPTIONS.find((o) => o.value === tipo)?.label || tipo;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

  const confidenceColor = (c: number) =>
    c >= 0.7 ? "text-primary" : c >= 0.4 ? "text-accent-foreground" : "text-destructive";

  return (
    <div className="space-y-4">
      <Alert variant="default" className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-900/10">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-200">
          Estimativa para orçamento preliminar. Não substitui projeto de estruturas.
        </AlertDescription>
      </Alert>

      <Button
        onClick={handleGenerate}
        disabled={generating || !siteCondition}
        className="w-full"
        variant="outline"
      >
        {generating ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        {scenarios.length > 0 ? "Regenerar Cenários com Axia™" : "Gerar Cenários com Axia™"}
      </Button>

      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {scenarios.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Preencha as condições do terreno e clique em "Gerar Cenários" para obter estimativas.
        </p>
      )}

      {scenarios.map((sc) => {
        const scenarioItems = items.filter((it) => it.scenario_id === sc.id);
        const isOpen = openId === sc.id;

        return (
          <Card key={sc.id} className={sc.selecionado ? "border-primary ring-1 ring-primary/20" : ""}>
            <Collapsible open={isOpen} onOpenChange={() => setOpenId(isOpen ? null : sc.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {sc.nome}
                      {sc.selecionado && (
                        <Badge variant="default" className="text-xs">
                          <Check className="w-3 h-3 mr-1" /> Selecionado
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {fundacaoLabel(sc.tipo_fundacao)} · {formatCurrency(sc.custo_estimado)}
                      <span className={`ml-2 ${confidenceColor(sc.axia_confidence)}`}>
                        {Math.round(sc.axia_confidence * 100)}% confiança
                      </span>
                    </CardDescription>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {sc.descricao && (
                    <p className="text-xs text-muted-foreground">{sc.descricao}</p>
                  )}

                  {sc.axia_reasoning && (
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-xs font-medium mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Justificação Axia
                      </p>
                      <p className="text-xs text-muted-foreground">{sc.axia_reasoning}</p>
                    </div>
                  )}

                  {scenarioItems.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1 flex items-center gap-1">
                        <Package className="w-3 h-3" /> Itens ({scenarioItems.length})
                      </p>
                      <div className="border rounded text-xs">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="text-left px-2 py-1">Descrição</th>
                              <th className="text-right px-2 py-1">Qtd</th>
                              <th className="text-right px-2 py-1">P.Unit.</th>
                              <th className="text-right px-2 py-1">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scenarioItems.map((it) => (
                              <tr key={it.id} className="border-b last:border-0">
                                <td className="px-2 py-1">{it.descricao}</td>
                                <td className="text-right px-2 py-1">
                                  {it.quantidade} {it.unidade}
                                </td>
                                <td className="text-right px-2 py-1">{formatCurrency(it.preco_unitario)}</td>
                                <td className="text-right px-2 py-1 font-medium">{formatCurrency(it.valor_total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {!sc.selecionado && (
                      <Button size="sm" variant="default" onClick={() => onSelectScenario(sc.id)}>
                        <Check className="w-3.5 h-3.5 mr-1" /> Selecionar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDeleteScenario(sc.id)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
