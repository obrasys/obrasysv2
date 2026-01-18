import { useState } from 'react';
import { useParametricEngine, useElementOpenings, useCalculatedParameters } from '@/hooks/useParametricEngine';
import { ElementsList } from './ElementsList';
import { ElementForm } from './ElementForm';
import { OpeningsManager } from './OpeningsManager';
import { CalculatedParamsCard } from './CalculatedParamsCard';
import { RulesSelector } from './RulesSelector';
import { LinkedArtigosCard } from './LinkedArtigosCard';
import type { ConstructiveElement, ElementFormData, ParametricRule } from '@/types/parametric';

interface ParametricMeasurementsProps {
  orcamentoId: string;
  isReadOnly?: boolean;
}

export function ParametricMeasurements({ orcamentoId, isReadOnly }: ParametricMeasurementsProps) {
  const [selectedElement, setSelectedElement] = useState<ConstructiveElement | null>(null);
  const [selectedRule, setSelectedRule] = useState<ParametricRule | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingElement, setEditingElement] = useState<ConstructiveElement | null>(null);

  const {
    elements,
    isLoadingElements,
    createElement,
    updateElement,
    deleteElement,
    rules,
    isLoadingRules,
    unlinkArtigoFromElement,
    coefficients,
    upsertCoefficient,
    deleteCoefficient,
  } = useParametricEngine(orcamentoId);

  // Hooks para o elemento selecionado
  const { openings, createOpening, deleteOpening } = useElementOpenings(
    selectedElement?.id || ''
  );
  const { params: calculatedParams, isLoading: isLoadingParams } = useCalculatedParameters(
    selectedElement?.id || ''
  );

  // Buscar artigos linkados
  const { getLinkedArtigos } = useParametricEngine(orcamentoId);
  const { data: linkedArtigos = [], isLoading: isLoadingLinked } = getLinkedArtigos(
    selectedElement?.id || ''
  );

  const handleCreateElement = () => {
    setEditingElement(null);
    setIsFormOpen(true);
  };

  const handleEditElement = (element: ConstructiveElement) => {
    setEditingElement(element);
    setIsFormOpen(true);
  };

  const handleSubmitElement = (data: ElementFormData) => {
    if (editingElement) {
      updateElement.mutate({ ...data, id: editingElement.id });
    } else {
      createElement.mutate(data);
    }
    setIsFormOpen(false);
    setEditingElement(null);
  };

  const handleDeleteElement = (id: string) => {
    deleteElement.mutate(id);
    if (selectedElement?.id === id) {
      setSelectedElement(null);
      setSelectedRule(null);
    }
  };

  const handleSelectElement = (element: ConstructiveElement | null) => {
    setSelectedElement(element);
    setSelectedRule(null); // Reset rule selection when element changes
  };

  const handleSelectRule = (rule: ParametricRule) => {
    setSelectedRule(rule);
  };

  const handleCreateOpening = (data: Parameters<typeof createOpening.mutate>[0]) => {
    createOpening.mutate(data);
  };

  const handleDeleteOpening = (id: string) => {
    deleteOpening.mutate(id);
  };

  const handleUnlinkArtigo = (artigoId: string) => {
    unlinkArtigoFromElement.mutate(artigoId);
  };

  const handleSaveCoefficient = (key: string, value: number) => {
    upsertCoefficient.mutate({ key, value });
  };

  const handleResetCoefficient = (id: string) => {
    deleteCoefficient.mutate(id);
  };

  // Filtrar regras para o elemento selecionado
  const compatibleRules = selectedElement
    ? rules.filter(
        (rule) =>
          rule.element_type === selectedElement.element_type &&
          rule.construction_method === selectedElement.construction_method
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header com info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Medições Paramétricas</h2>
          <p className="text-sm text-muted-foreground">
            Crie elementos construtivos para gerar quantidades automáticas nos artigos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Lista de Elementos */}
        <div className="space-y-4">
          <ElementsList
            elements={elements}
            selectedElementId={selectedElement?.id || null}
            onSelectElement={handleSelectElement}
            onCreateElement={handleCreateElement}
            onEditElement={handleEditElement}
            onDeleteElement={handleDeleteElement}
            isLoading={isLoadingElements}
          />
        </div>

        {/* Coluna 2: Detalhes do Elemento */}
        <div className="space-y-4">
          <CalculatedParamsCard
            params={selectedElement ? calculatedParams : []}
            isLoading={isLoadingParams && !!selectedElement}
          />

          <OpeningsManager
            openings={selectedElement ? openings : []}
            isLoading={false}
            onCreateOpening={handleCreateOpening}
            onDeleteOpening={handleDeleteOpening}
            disabled={!selectedElement || isReadOnly}
          />
        </div>

        {/* Coluna 3: Regras e Artigos Linkados */}
        <div className="space-y-4">
          <RulesSelector
            rules={compatibleRules}
            element={selectedElement}
            selectedRuleId={selectedRule?.id}
            isLoading={isLoadingRules}
            onSelectRule={handleSelectRule}
            coefficients={coefficients}
            onSaveCoefficient={handleSaveCoefficient}
            onResetCoefficient={handleResetCoefficient}
          />

          <LinkedArtigosCard
            artigos={linkedArtigos as any[]}
            isLoading={isLoadingLinked}
            onUnlink={isReadOnly ? undefined : handleUnlinkArtigo}
            disabled={!selectedElement}
          />
        </div>
      </div>

      {/* Form Modal */}
      <ElementForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmitElement}
        initialData={editingElement}
        isLoading={createElement.isPending || updateElement.isPending}
      />
    </div>
  );
}
