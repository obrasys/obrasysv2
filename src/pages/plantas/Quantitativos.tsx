import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { PlanMappingTable } from "@/components/plantas/PlanMappingTable";
import { PlanQuantitativosReview } from "@/components/plantas/PlanQuantitativosReview";
import { PlanQuantitativosByRoom } from "@/components/plantas/PlanQuantitativosByRoom";
import { PlanBulkValidation } from "@/components/plantas/PlanBulkValidation";
import { PlanExportableMap } from "@/components/plantas/PlanExportableMap";
import { PlanBudgetGenerator } from "@/components/plantas/PlanBudgetGenerator";
import { PlanInfraTab } from "@/components/plantas/PlanInfraTab";
import { AxiaPlanSuggestionsPanel } from "@/components/plantas/AxiaPlanSuggestionsPanel";
import { PlanCrossValidationPanel } from "@/components/plantas/PlanCrossValidationPanel";
import { PlanRoomTemplatesPanel } from "@/components/plantas/PlanRoomTemplatesPanel";
import { PlanQuantityTable } from "@/components/plantas/PlanQuantityTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Table2, ClipboardList, Home, FileDown, CheckSquare, HardHat, Layers, Database } from "lucide-react";
import { useState } from "react";
import type { TipoBase } from "@/hooks/useBaseArtigos";
import { usePlanImports } from "@/hooks/usePlanImports";
import { usePlanMeasurements } from "@/hooks/usePlanMeasurements";
import { usePlanMappings } from "@/hooks/usePlanMappings";
import { usePlanRooms } from "@/hooks/usePlanRooms";
import { useAxiaPlanSuggestions } from "@/hooks/useAxiaPlanSuggestions";
import { useAxiaCrossValidation } from "@/hooks/useAxiaCrossValidation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PlanQuantitativos() {
  const params = useParams<{ id?: string; budgetId?: string; planId: string }>();
  const obraId = params.id;
  const budgetId = params.budgetId;
  const planId = params.planId;
  const isBudgetScope = !!budgetId;
  const baseRoute = isBudgetScope ? `/orcamentos/${budgetId}/plantas` : `/obras/${obraId}/plantas`;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoOpenBudget = searchParams.get("openBudget") === "1";

  const { plans, isLoading: plansLoading } = usePlanImports(
    isBudgetScope ? { budgetId } : { obraId },
  );
  const plan = plans.find((p) => p.id === planId);

  // When entering via /orcamentos/:budgetId/plantas, obraId is not in the URL.
  // Resolve it from the budget so "Enviar para Orçamento" (PlanBudgetSendDialog
  // only renders when obraId is known) works in this scope too.
  const budgetObraQuery = useQuery({
    queryKey: ["budget-obra-id", budgetId],
    queryFn: async () => {
      if (!budgetId) return null;
      const { data, error } = await supabase
        .from("orcamentos")
        .select("obra_id")
        .eq("id", budgetId)
        .maybeSingle();
      if (error) throw error;
      return (data?.obra_id as string | null) ?? null;
    },
    enabled: !!budgetId,
  });
  const effectiveObraId = obraId ?? budgetObraQuery.data ?? undefined;

  const { measurements, updateMeasurement, bulkUpdateValidation } = usePlanMeasurements(planId);
  const { mappings, createMapping, updateMapping, deleteMapping } = usePlanMappings(planId);
  const { rooms, roomMeasurements } = usePlanRooms(planId);
  const { suggestions, loading: axiaLoading, error: axiaError, fetchSuggestions, dismissSuggestion } = useAxiaPlanSuggestions();
  const { alerts, loading: cvLoading, error: cvError, validate: runCrossValidation, dismissAlert } = useAxiaCrossValidation();

  // Tipo de base ativo (Geral / Remodelação) - partilhado com Essencial e Avançado
  const [tipoBase, setTipoBase] = useState<TipoBase>("geral");

  // Load articles: priorizar base_artigos_user (nova Base de Preços) com fallback para
  // base_precos_personalizada + default_articles (legados) - tudo unificado num único array
  // para preservar a interface dos componentes filhos.
  const articlesQuery = useQuery({
    queryKey: ["plan-articles-for-mapping", tipoBase],
    queryFn: async () => {
      const [baseRes, customRes, defaultRes] = await Promise.all([
        supabase
          .from("base_artigos_user" as any)
          .select("id, codigo, artigo, unidade, preco_indicativo_eur, capitulo, tipo_base")
          .eq("tipo_base", tipoBase)
          .order("capitulo"),
        supabase.from("base_precos_personalizada").select("id, codigo, descricao, unidade, preco_unitario, categoria").order("categoria"),
        supabase.from("default_articles").select("id, codigo, descricao, unidade, preco_unitario, categoria").order("categoria"),
      ]);

      const base = ((baseRes.data ?? []) as any[]).map((a) => ({
        id: a.id,
        codigo: a.codigo,
        descricao: a.artigo,
        unidade: a.unidade,
        preco_unitario: a.preco_indicativo_eur ?? 0,
        categoria: a.capitulo,
        _source: "base_precos" as const,
      }));
      const custom = (customRes.data ?? []).map((a) => ({ ...a, preco_unitario: a.preco_unitario ?? 0, _source: "custom" as const }));
      const defaults = (defaultRes.data ?? []).map((a) => ({ ...a, preco_unitario: a.preco_unitario ?? 0, _source: "default" as const }));

      // Ordem de prioridade: Base de Preços > Personalizado > Default
      return [...base, ...custom, ...defaults];
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

  const handleCrossValidation = () => {
    if (!obraId) return;
    runCrossValidation({ obraId, measurements, mappings, rooms });
  };

  const handleBulkValidate = (ids: string[], estado: "validado" | "rejeitado" | "pendente") => {
    if (!ids.length) {
      toast.error("Nenhuma medição selecionada");
      return;
    }
    bulkUpdateValidation.mutate({ ids, estado: estado as any });
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
          <Button className="mt-4" onClick={() => navigate(baseRoute)}>
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const articles = articlesQuery.data ?? [];

  // Ensure the selected article exists in base_precos_personalizada (FK target).
  // If the user picked a row from default_articles or base_artigos_user (Base de Preços),
  // clone it into the user's custom price base so the FK is satisfied.
  const resolveArticleId = async (artigoBaseId?: string): Promise<string | undefined> => {
    if (!artigoBaseId) return undefined;
    const art = articles.find((a) => a.id === artigoBaseId);
    if (!art) return artigoBaseId;
    if ((art as any)._source === "custom") return artigoBaseId;

    // Clone default article into base_precos_personalizada
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error("Não autenticado");

    // Reuse if already cloned (match by codigo for this user)
    const { data: existing } = await supabase
      .from("base_precos_personalizada")
      .select("id")
      .eq("user_id", userId)
      .eq("codigo", art.codigo)
      .maybeSingle();
    if (existing?.id) return existing.id;

    const { data: inserted, error } = await supabase
      .from("base_precos_personalizada")
      .insert({
        user_id: userId,
        codigo: art.codigo,
        descricao: art.descricao,
        unidade: art.unidade,
        preco_unitario: art.preco_unitario,
        categoria: art.categoria,
      })
      .select("id")
      .single();
    if (error) throw error;
    return inserted.id;
  };

  const handleCreateMapping = async (data: Parameters<typeof createMapping.mutate>[0]) => {
    try {
      const resolved = await resolveArticleId(data.artigoBaseId);
      createMapping.mutate({ ...data, artigoBaseId: resolved });
    } catch (e: any) {
      toast.error("Erro ao adicionar o artigo: " + e.message);
    }
  };

  const handleUpdateMapping = async (data: Parameters<typeof updateMapping.mutate>[0]) => {
    try {
      const resolved = await resolveArticleId(data.artigoBaseId);
      updateMapping.mutate({ ...data, artigoBaseId: resolved });
    } catch (e: any) {
      toast.error("Erro ao atualizar o artigo: " + e.message);
    }
  };


  return (
    <AppLayout title={`Quantitativos - ${plan.nome_ficheiro}`} subtitle={`Rev. ${plan.revision_number}`}>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`${baseRoute}/${planId}`)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Planta
            </Button>
            <span className="text-sm text-muted-foreground">{plan.nome_ficheiro}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-muted/30">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground hidden sm:inline">Base de Preços:</span>
              <Select value={tipoBase} onValueChange={(v) => setTipoBase(v as TipoBase)}>
                <SelectTrigger className="h-7 w-[140px] border-0 bg-transparent text-sm font-medium focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="remodelacao">Remodelação</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="text-[10px]">
                {articles.filter((a: any) => a._source === "base_precos").length} artigos
              </Badge>
            </div>
            <PlanBudgetGenerator
              obraId={effectiveObraId}
              targetBudgetId={budgetId}
              planId={planId!}
              planName={plan.nome_ficheiro}
              measurements={measurements}
              mappings={mappings}
              rooms={rooms}
              articles={articles}
              tipoBase={tipoBase}
              disciplina={(plan as any).disciplina}
              autoOpen={autoOpenBudget}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Main content */}
          <Tabs defaultValue="unified">
            <TabsList className="flex-wrap">
              <TabsTrigger value="unified" className="gap-1.5">
                <Layers className="w-4 h-4" />
                Tabela Unificada
              </TabsTrigger>
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
              <TabsTrigger value="infra" className="gap-1.5">
                <HardHat className="w-4 h-4" />
                Infraestrutura
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unified" className="mt-4">
              <PlanQuantityTable planImportId={planId} obraId={effectiveObraId} disciplina={(plan as any).disciplina} planName={plan.nome_ficheiro} />
            </TabsContent>

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
                onCreateMapping={handleCreateMapping}
                onUpdateMapping={handleUpdateMapping}
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

            <TabsContent value="infra" className="mt-4">
              {obraId ? (
                <PlanInfraTab obraId={obraId} />
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground bg-muted/40 rounded-lg">
                  Os cenários de infraestrutura ficam disponíveis depois de a obra ser criada (adjudicação do orçamento).
                </div>
              )}
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
            <PlanCrossValidationPanel
              alerts={alerts}
              loading={cvLoading}
              error={cvError}
              onRefresh={handleCrossValidation}
              onDismiss={dismissAlert}
            />
            <PlanRoomTemplatesPanel />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
