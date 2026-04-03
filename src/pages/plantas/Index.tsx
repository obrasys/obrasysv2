import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { usePlanImports } from "@/hooks/usePlanImports";
import { PlanUploadForm } from "@/components/plantas/PlanUploadForm";
import { PlanCard } from "@/components/plantas/PlanCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin } from "lucide-react";
import { useState } from "react";

export default function PlantasIndex() {
  const { id: obraId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { plans, isLoading, uploadPlan, deletePlan } = usePlanImports(obraId);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <AppLayout title="Medição Assistida por Planta" subtitle="Importe plantas, meça quantitativos e gere pré-orçamentos">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/obras/${obraId}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar à obra
          </Button>
          <Button onClick={() => setShowUpload(true)}>
            Importar Planta
          </Button>
        </div>

        {/* Upload Form */}
        {showUpload && (
          <PlanUploadForm
            obraId={obraId!}
            onUpload={async (data) => {
              await uploadPlan.mutateAsync(data);
              setShowUpload(false);
            }}
            isUploading={uploadPlan.isPending}
            onCancel={() => setShowUpload(false)}
          />
        )}

        {/* Plans List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : plans.length === 0 && !showUpload ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <MapPin className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma planta importada
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Importe uma planta em PDF ou imagem para começar a medir quantitativos.
            </p>
            <Button onClick={() => setShowUpload(true)}>
              Importar Primeira Planta
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onOpen={() => navigate(`/obras/${obraId}/plantas/${plan.id}`)}
                onDelete={() => deletePlan.mutate(plan.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
