import { PlanSiteConditionsForm } from "./PlanSiteConditionsForm";
import { PlanInfraScenariosPanel } from "./PlanInfraScenariosPanel";
import { usePlanSiteConditions } from "@/hooks/usePlanSiteConditions";
import { usePlanInfraScenarios } from "@/hooks/usePlanInfraScenarios";

interface Props {
  obraId: string;
}

export function PlanInfraTab({ obraId }: Props) {
  const { siteCondition, isLoading: scLoading, upsert } = usePlanSiteConditions(obraId);
  const {
    scenarios,
    items,
    isLoading: scenariosLoading,
    selectScenario,
    deleteScenario,
    insertScenariosWithItems,
  } = usePlanInfraScenarios(siteCondition?.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <PlanSiteConditionsForm
        siteCondition={siteCondition}
        onSave={(data) => upsert.mutate(data as any)}
        isSaving={upsert.isPending}
      />
      <PlanInfraScenariosPanel
        siteCondition={siteCondition}
        scenarios={scenarios}
        items={items}
        onSelectScenario={(id) => selectScenario.mutate(id)}
        onDeleteScenario={(id) => deleteScenario.mutate(id)}
        onScenariosGenerated={(payload) => insertScenariosWithItems.mutate(payload)}
        isLoading={scenariosLoading || scLoading}
      />
    </div>
  );
}
