import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { usePlanImports } from "@/hooks/usePlanImports";
import { PlanUploadForm } from "@/components/plantas/PlanUploadForm";
import { PlanCard } from "@/components/plantas/PlanCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

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

  return (
    <AppLayout title="Medição Assistida por Planta" subtitle="Importe plantas, meça quantitativos e gere pré-orçamentos">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(backRoute)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> {backLabel}
          </Button>
          <Button onClick={() => setShowUpload(true)}>
            Importar Planta
          </Button>
        </div>

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
              <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : plans.length === 0 && !showUpload ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <p className="text-muted-foreground mb-4">Nenhuma planta importada.</p>
            <Button onClick={() => setShowUpload(true)}>Importar primeira planta</Button>
          </div>
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
