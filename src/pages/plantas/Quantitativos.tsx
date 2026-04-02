import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { PlanMappingTable } from "@/components/plantas/PlanMappingTable";
import { PlanQuantitativosReview } from "@/components/plantas/PlanQuantitativosReview";
import { PlanQuantitativosByRoom } from "@/components/plantas/PlanQuantitativosByRoom";
import { PlanBulkValidation } from "@/components/plantas/PlanBulkValidation";
import { PlanExportableMap } from "@/components/plantas/PlanExportableMap";
import { PlanBudgetGenerator } from "@/components/plantas/PlanBudgetGenerator";
import { AxiaPlanSuggestionsPanel } from "@/components/plantas/AxiaPlanSuggestionsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Table2, ClipboardList, Home, FileDown, CheckSquare } from "lucide-react";
import { usePlanImports } from "@/hooks/usePlanImports";
import { usePlanMeasurements } from "@/hooks/usePlanMeasurements";
import { usePlanMappings } from "@/hooks/usePlanMappings";
import { usePlanRooms } from "@/hooks/usePlanRooms";
import { useAxiaPlanSuggestions } from "@/hooks/useAxiaPlanSuggestions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PlanQuantitativos() {
  const { id: obraId, planId } = useParams<{ id: string; planId: string }>();
  const navigate = useNavigate();

  const { plans, isLoading: plansLoading } = usePlanImports(obraId);
  const plan = plans.find((p) => p.id === planId);
  const { measurements, updateMeasurement } = usePlanMeasurements(planId);
  const { mappings, createMapping, updateMapping, deleteMapping } = usePlanMappings(planId);
  const { rooms, roomMeasurements } = usePlanRooms(planId);
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

  const handleBulkValidate = (ids: string[], estado: "validado" | "rejeitado" | "pendente") => {
    let completed = 0;
    ids.forEach((id) => {
      updateMeasurement.mutate(
        { id, estadoValidacao: estado as any },
        {
          onSuccess: () => {
            completed++;
            if (completed === ids.length) {
              toast.success(`${ids.length} medição(ões) atualizadas para "${estado}"`);
            }
          },
        }
      );
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
          <Tabs defaultValue="byRoom">
            <TabsList className="flex-wrap">
              <TabsTrigger value="byRoom" className="gap-1.5">
                <Home className="w-4 h-4" />
                Por Compartimento
              </TabsTrigger>
              <TabsTrigger value="mapping" className="gap-1.5">
                <Table2 className="w-4 h-4" />
                Mapeamento
              </TabsTrigger>
              <TabsTrigger value="review" className="gap-1.5">
                <ClipboardList className="w-4 h-4" />
                Revisão
              </TabsTrigger>
              <TabsTrigger value="validation" className="gap-1.5">
                <CheckSquare className="w-4 h-4" />
                Validação
              </TabsTrigger>
              <TabsTrigger value="export" className="gap-1.5">
                <FileDown className="w-4 h-4" />
                Mapa
              </TabsTrigger>
            </TabsList>

            <TabsContent value="byRoom" className="mt-4">
              <PlanQuantitativosByRoom
                measurements={measurements}
                mappings={mappings}
                articles={articles}
                rooms={rooms}
                roomMeasurements={roomMeasurements}
                onValidateMeasurement={(id, estado) =>
                  updateMeasurement.mutate({ id, estadoValidacao: estado })
                }
              />
            </TabsContent>

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

            <TabsContent value="validation" className="mt-4">
              <PlanBulkValidation
                measurements={measurements}
                onBulkValidate={handleBulkValidate}
              />
            </TabsContent>

            <TabsContent value="export" className="mt-4">
              <PlanExportableMap
                measurements={measurements}
                mappings={mappings}
                articles={articles}
                rooms={rooms}
                roomMeasurements={roomMeasurements}
                planName={plan.nome_ficheiro}
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
