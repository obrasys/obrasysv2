import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { PlanMappingTable } from "@/components/plantas/PlanMappingTable";
import { PlanQuantitativosReview } from "@/components/plantas/PlanQuantitativosReview";
import { PlanBudgetGenerator } from "@/components/plantas/PlanBudgetGenerator";
import { AxiaPlanSuggestionsPanel } from "@/components/plantas/AxiaPlanSuggestionsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Table2, ClipboardList } from "lucide-react";
import { usePlanImports } from "@/hooks/usePlanImports";
import { usePlanMeasurements } from "@/hooks/usePlanMeasurements";
import { usePlanMappings } from "@/hooks/usePlanMappings";
import { useAxiaPlanSuggestions } from "@/hooks/useAxiaPlanSuggestions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function PlanQuantitativos() {
  const { id: obraId, planId } = useParams<{ id: string; planId: string }>();
  const navigate = useNavigate();

  const { plans, isLoading: plansLoading } = usePlanImports(obraId);
  const plan = plans.find((p) => p.id === planId);
  const { measurements, updateMeasurement } = usePlanMeasurements(planId);
  const { mappings, createMapping, updateMapping, deleteMapping } = usePlanMappings(planId);
  const { suggestions, loading: axiaLoading, error: axiaError, fetchSuggestions, dismissSuggestion } = useAxiaPlanSuggestions();

  // Load articles from base_precos_personalizada + default_articles
  const articlesQuery = useQuery({
    queryKey: ["plan-articles-for-mapping"],
    queryFn: async () => {
      const [customRes, defaultRes] = await Promise.all([
        supabase.from("base_precos_personalizada").select("id, codigo, descricao, unidade, preco_unitario, categoria").order("categoria"),
        supabase.from("default_articles").select("id, codigo, descricao, unidade, preco_unitario, categoria").order("categoria"),
      ]);

      const custom = (customRes.data ?? []).map((a) => ({ ...a, preco_unitario: a.preco_unitario ?? 0 }));
      const defaults = (defaultRes.data ?? []).map((a) => ({ ...a, preco_unitario: a.preco_unitario ?? 0 }));

      return [...custom, ...defaults];
    },
  });

  const handleRefreshAxia = () => {
    if (!obraId) return;
    const articles = articlesQuery.data ?? [];
    fetchSuggestions({
      obraId,
      measurements,
      mappings,
      articles,
    });
  };

  if (plansLoading) {
    return (
      <AppLayout title="Quantitativos">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!plan) {
    return (
      <AppLayout title="Planta não encontrada">
        <div className="text-center py-16">
          <p className="text-muted-foreground">Planta não encontrada.</p>
          <Button className="mt-4" onClick={() => navigate(`/obras/${obraId}/plantas`)}>
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const articles = articlesQuery.data ?? [];

  return (
    <AppLayout title={`Quantitativos — ${plan.nome_ficheiro}`} subtitle={`Rev. ${plan.revision_number}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/obras/${obraId}/plantas/${planId}`)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Planta
            </Button>
            <span className="text-sm text-muted-foreground">{plan.nome_ficheiro}</span>
          </div>
          <PlanBudgetGenerator
            obraId={obraId!}
            planId={planId!}
            planName={plan.nome_ficheiro}
            measurements={measurements}
            mappings={mappings}
            articles={articles}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Main content */}
          <Tabs defaultValue="mapping">
            <TabsList>
              <TabsTrigger value="mapping" className="gap-1.5">
                <Table2 className="w-4 h-4" />
                Mapeamento
              </TabsTrigger>
              <TabsTrigger value="review" className="gap-1.5">
                <ClipboardList className="w-4 h-4" />
                Revisão
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mapping" className="mt-4">
              <PlanMappingTable
                measurements={measurements}
                mappings={mappings}
                articles={articles}
                onCreateMapping={(data) => createMapping.mutate(data)}
                onUpdateMapping={(data) => updateMapping.mutate(data)}
                onDeleteMapping={(id) => deleteMapping.mutate(id)}
                onUpdateMeasurement={(id, updates) =>
                  updateMeasurement.mutate({
                    id,
                    valorAjustado: updates.valorAjustado,
                    valorFinal: updates.valorFinal,
                    estadoValidacao: updates.estadoValidacao as any,
                  })
                }
                isLoading={articlesQuery.isLoading}
              />
            </TabsContent>

            <TabsContent value="review" className="mt-4">
              <PlanQuantitativosReview
                measurements={measurements}
                mappings={mappings}
                articles={articles}
                onValidateMeasurement={(id, estado) =>
                  updateMeasurement.mutate({ id, estadoValidacao: estado })
                }
                onUpdateFinal={(id, valorFinal) =>
                  updateMeasurement.mutate({ id, valorFinal })
                }
              />
            </TabsContent>
          </Tabs>

          {/* Axia sidebar */}
          <div className="space-y-4">
            <AxiaPlanSuggestionsPanel
              suggestions={suggestions}
              loading={axiaLoading}
              error={axiaError}
              onRefresh={handleRefreshAxia}
              onDismiss={dismissSuggestion}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
