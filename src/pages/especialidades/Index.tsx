import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers } from "lucide-react";
import { useSpecialtyPlans } from "@/hooks/useSpecialtyPlans";
import { SpecialtyPlanUploadForm } from "@/components/especialidades/SpecialtyPlanUploadForm";
import { SpecialtyPlanCard } from "@/components/especialidades/SpecialtyPlanCard";
import { SPECIALTY_LABELS, SPECIALTY_ORDER, type SpecialtyType } from "@/types/especialidades";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function EspecialidadesIndex() {
  const { id: obraId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { plans, isLoading, uploadPlan, deletePlan } = useSpecialtyPlans(obraId);
  const [showUpload, setShowUpload] = useState(false);
  const [filter, setFilter] = useState<SpecialtyType | "all">("all");

  const countsByType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of plans) map[p.specialty_type] = (map[p.specialty_type] ?? 0) + 1;
    return map;
  }, [plans]);

  const filtered = filter === "all" ? plans : plans.filter((p) => p.specialty_type === filter);

  return (
    <AppLayout title="Plantas de Especialidades" subtitle="Carregue plantas técnicas e marque pontos por sistema">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/obras/${obraId}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar à obra
          </Button>
          <Button onClick={() => setShowUpload(true)}>Carregar planta de especialidade</Button>
        </div>

        {showUpload && (
          <SpecialtyPlanUploadForm
            obraId={obraId!}
            isUploading={uploadPlan.isPending}
            onCancel={() => setShowUpload(false)}
            onUpload={async (d) => { await uploadPlan.mutateAsync(d); setShowUpload(false); }}
          />
        )}

        {/* Cards por especialidade */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card
            className={`rounded-xl cursor-pointer ${filter === "all" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilter("all")}
          >
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Todas</p>
              <p className="text-2xl font-bold">{plans.length}</p>
            </CardContent>
          </Card>
          {SPECIALTY_ORDER.filter((s) => s !== "outra").map((s) => (
            <Card
              key={s}
              className={`rounded-xl cursor-pointer ${filter === s ? "ring-2 ring-primary" : ""}`}
              onClick={() => setFilter(s)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{SPECIALTY_LABELS[s]}</p>
                  <p className="text-2xl font-bold">{countsByType[s] ?? 0}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">plantas</Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <Layers className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sem plantas nesta especialidade</h3>
            <p className="text-sm text-muted-foreground mb-4">Carregue uma planta técnica para começar.</p>
            <Button onClick={() => setShowUpload(true)}>Carregar planta de especialidade</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <SpecialtyPlanCard
                key={p.id}
                plan={p}
                onOpen={() => navigate(`/obras/${obraId}/especialidades/${p.id}`)}
                onDelete={() => deletePlan.mutate(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
