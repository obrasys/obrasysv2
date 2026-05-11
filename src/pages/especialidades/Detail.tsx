import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useSpecialtyPlan } from "@/hooks/useSpecialtyPlans";
import { useSpecialtyElements } from "@/hooks/useSpecialtyElements";
import { SpecialtyPlanCanvas } from "@/components/especialidades/SpecialtyPlanCanvas";
import { SpecialtySymbolPicker } from "@/components/especialidades/SpecialtySymbolPicker";
import { SpecialtyDetectedElementsPanel } from "@/components/especialidades/SpecialtyDetectedElementsPanel";
import { SpecialtyAxiaAnalysis } from "@/components/especialidades/SpecialtyAxiaAnalysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SPECIALTY_LABELS, type SpecialtySymbol } from "@/types/especialidades";

export default function EspecialidadeDetail() {
  const { id: obraId, planId } = useParams<{ id: string; planId: string }>();
  const navigate = useNavigate();
  const { data: plan } = useSpecialtyPlan(planId);
  const { elements, addElement, updateElement, deleteElement } = useSpecialtyElements(planId);
  const [picked, setPicked] = useState<SpecialtySymbol | null>(null);

  if (!plan) {
    return (
      <AppLayout title="Especialidade" subtitle="">
        <div className="p-6 text-muted-foreground">A carregar planta…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={plan.nome_ficheiro} subtitle={SPECIALTY_LABELS[plan.specialty_type]}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/obras/${obraId}/especialidades`)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{SPECIALTY_LABELS[plan.specialty_type]}</Badge>
            {plan.floor_level && <Badge variant="secondary">{plan.floor_level}</Badge>}
            <Badge>{plan.status}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sidebar esquerda: símbolos */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Símbolos técnicos</CardTitle>
                {picked && (
                  <p className="text-[11px] text-primary">
                    Ativo: <strong>{picked.symbol_name}</strong> — clique na planta para adicionar
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <SpecialtySymbolPicker
                  specialtyType={plan.specialty_type}
                  selectedKey={picked?.symbol_key ?? null}
                  onSelect={(s) => setPicked(s)}
                />
              </CardContent>
          </Card>
            <SpecialtyAxiaAnalysis plan={plan} />
          </div>

          {/* Centro: visualizador */}
          <div className="lg:col-span-6">
            <SpecialtyPlanCanvas
              plan={plan}
              elements={elements}
              onCanvasClick={
                picked
                  ? (x, y) => {
                      addElement.mutate({
                        planId: plan.id,
                        specialty_type: plan.specialty_type,
                        symbol_type: picked.symbol_key,
                        label: picked.symbol_name,
                        unit: picked.unit,
                        x, y,
                        floor_level: plan.floor_level ?? undefined,
                      });
                    }
                  : undefined
              }
            />
            {!picked && (
              <p className="text-xs text-muted-foreground mt-2">
                Selecione um símbolo na lista da esquerda para o adicionar com um clique sobre a planta.
              </p>
            )}
          </div>

          {/* Direita: elementos */}
          <div className="lg:col-span-3">
            <SpecialtyDetectedElementsPanel
              elements={elements}
              onConfirm={(id) => updateElement.mutate({ id, patch: { review_required: false, user_confirmed: true } })}
              onDelete={(id) => deleteElement.mutate(id)}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
