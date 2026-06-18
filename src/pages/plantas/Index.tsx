import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { usePlanImports } from "@/hooks/usePlanImports";
import { PlanUploadForm } from "@/components/plantas/PlanUploadForm";
import { PlanCard } from "@/components/plantas/PlanCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, FileStack, Ruler, Layers, ScanLine } from "lucide-react";
import { useState, useMemo } from "react";
import { PageHeader, MetricCard, MetricCardGrid, EmptyState } from "@/components/patterns";

export default function PlantasIndex() {
  const params = useParams<{ id?: string; budgetId?: string }>();
  const obraId = params.id;
  const budgetId = params.budgetId;
  const isBudgetScope = !!budgetId;
  const navigate = useNavigate();
  const { plans, isLoading, uploadPlan, deletePlan } = usePlanImports(
    isBudgetScope ? { budgetId } : { obraId },
  );
  const [showUpload, setShowUpload] = useState(false);

  const baseRoute = isBudgetScope ? `/orcamentos/${budgetId}/plantas` : `/obras/${obraId}/plantas`;
  const backRoute = isBudgetScope ? `/orcamentos/${budgetId}/editar` : `/obras/${obraId}`;
  const backLabel = isBudgetScope ? "Voltar ao orçamento" : "Voltar à obra";

  const metrics = useMemo(() => {
    const total = plans.length;
    const calibrated = plans.filter((p: any) => p?.calibrated || p?.scale_calibrated).length;
    const withMeasurements = plans.filter((p: any) => (p?.measurements_count ?? 0) > 0).length;
    const lastUpdated = plans
      .map((p: any) => p?.updated_at || p?.created_at)
      .filter(Boolean)
      .sort()
      .pop();
    return { total, calibrated, withMeasurements, lastUpdated };
  }, [plans]);

  return (
    <AppLayout title="Medição Assistida por Planta" subtitle="Importe plantas, meça quantitativos e gere pré-orçamentos">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        <Button variant="ghost" size="sm" onClick={() => navigate(backRoute)} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> {backLabel}
        </Button>

        <PageHeader
          eyebrow={isBudgetScope ? "Orçamento" : "Obra"}
          title="Plantas & Medições"
          subtitle="Importe plantas em PDF, calibre escalas, meça áreas e perímetros, e envie quantitativos para orçamento."
          actions={
            <Button onClick={() => setShowUpload(true)} className="gap-2">
              <Upload className="w-4 h-4" /> Importar Planta
            </Button>
          }
        />

        <MetricCardGrid columns={4}>
          <MetricCard label="Plantas importadas" value={metrics.total} icon={FileStack} tone="primary" />
          <MetricCard label="Calibradas" value={metrics.calibrated} icon={Ruler} tone="success" hint={`${metrics.total - metrics.calibrated} por calibrar`} />
          <MetricCard label="Com medições" value={metrics.withMeasurements} icon={ScanLine} tone="default" />
          <MetricCard
            label="Última atualização"
            value={metrics.lastUpdated ? new Date(metrics.lastUpdated).toLocaleDateString("pt-PT") : "—"}
            icon={Layers}
            tone="default"
          />
        </MetricCardGrid>

        {showUpload && (
          <PlanUploadForm
            obraId={obraId}
            budgetId={budgetId}
            onUpload={async (data) => {
              await uploadPlan.mutateAsync(data);
              setShowUpload(false);
            }}
            isUploading={uploadPlan.isPending}
            onCancel={() => setShowUpload(false)}
          />
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : plans.length === 0 && !showUpload ? (
          <EmptyState
            icon={FileStack}
            title="Nenhuma planta importada"
            description="Carregue a primeira planta em PDF para começar a medir áreas, perímetros e quantitativos."
            action={
              <Button onClick={() => setShowUpload(true)} className="gap-2">
                <Upload className="w-4 h-4" /> Importar primeira planta
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onOpen={() => navigate(`${baseRoute}/${plan.id}`)}
                onDelete={() => deletePlan.mutate(plan.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
