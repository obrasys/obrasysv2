import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type {
  ConstructiveElement,
  ElementOpening,
  CalculatedParameter,
  ParametricRule,
  ValidationResult,
  ElementFormData,
  OpeningFormData,
  WallParameters,
  FloorParameters,
  RoofParameters,
} from '@/types/parametric';

// =====================================================
// Hook principal para o Motor Paramétrico
// =====================================================

export function useParametricEngine(orcamentoId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // =====================================================
  // ELEMENTOS CONSTRUTIVOS
  // =====================================================

  const {
    data: elements = [],
    isLoading: isLoadingElements,
    refetch: refetchElements,
  } = useQuery({
    queryKey: ['constructive-elements', orcamentoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('constructive_elements')
        .select('*')
        .eq('orcamento_id', orcamentoId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as ConstructiveElement[];
    },
    enabled: !!orcamentoId && !!user,
  });

  const createElement = useMutation({
    mutationFn: async (formData: ElementFormData) => {
      // Construir objeto de parâmetros baseado no tipo de elemento
      let parameters: WallParameters | FloorParameters | RoofParameters;

      if (formData.element_type === 'wall') {
        parameters = {
          length_m: formData.length_m,
          height_m: formData.height_m || 2.7,
          thickness_cm: formData.thickness_cm,
          layer_count: formData.layer_count || 1,
          wall_side_count: formData.wall_side_count || 2,
        };
      } else if (formData.element_type === 'roof') {
        parameters = {
          length_m: formData.length_m,
          width_m: formData.width_m || 0,
          thickness_cm: formData.thickness_cm,
          slope_factor: formData.slope_factor || 1.1,
        };
      } else {
        parameters = {
          length_m: formData.length_m,
          width_m: formData.width_m || 0,
          thickness_cm: formData.thickness_cm,
        };
      }

      const { data, error } = await supabase
        .from('constructive_elements')
        .insert([{
          orcamento_id: orcamentoId,
          element_type: formData.element_type,
          name: formData.name,
          construction_method: formData.construction_method,
          functional_type: formData.functional_type,
          configuration_type: formData.configuration_type,
          parameters: JSON.parse(JSON.stringify(parameters)),
          insulation_type: formData.insulation_type || null,
          insulation_thickness_cm: formData.insulation_thickness_cm || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ConstructiveElement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constructive-elements', orcamentoId] });
      toast({ title: 'Elemento criado', description: 'Elemento construtivo adicionado com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const updateElement = useMutation({
    mutationFn: async ({ id, ...formData }: ElementFormData & { id: string }) => {
      let parameters: WallParameters | FloorParameters | RoofParameters;

      if (formData.element_type === 'wall') {
        parameters = {
          length_m: formData.length_m,
          height_m: formData.height_m || 2.7,
          thickness_cm: formData.thickness_cm,
          layer_count: formData.layer_count || 1,
          wall_side_count: formData.wall_side_count || 2,
        };
      } else if (formData.element_type === 'roof') {
        parameters = {
          length_m: formData.length_m,
          width_m: formData.width_m || 0,
          thickness_cm: formData.thickness_cm,
          slope_factor: formData.slope_factor || 1.1,
        };
      } else {
        parameters = {
          length_m: formData.length_m,
          width_m: formData.width_m || 0,
          thickness_cm: formData.thickness_cm,
        };
      }

      const { data, error } = await supabase
        .from('constructive_elements')
        .update({
          element_type: formData.element_type,
          name: formData.name,
          construction_method: formData.construction_method,
          functional_type: formData.functional_type,
          configuration_type: formData.configuration_type,
          parameters: JSON.parse(JSON.stringify(parameters)),
          insulation_type: formData.insulation_type || null,
          insulation_thickness_cm: formData.insulation_thickness_cm || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ConstructiveElement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constructive-elements', orcamentoId] });
      queryClient.invalidateQueries({ queryKey: ['calculated-parameters'] });
      toast({ title: 'Elemento atualizado', description: 'Parâmetros recalculados automaticamente' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteElement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('constructive_elements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constructive-elements', orcamentoId] });
      toast({ title: 'Elemento eliminado' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // =====================================================
  // ABERTURAS
  // =====================================================

  const getOpenings = (elementId: string) => {
    return useQuery({
      queryKey: ['element-openings', elementId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('element_openings')
          .select('*')
          .eq('element_id', elementId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data as ElementOpening[];
      },
      enabled: !!elementId,
    });
  };

  const createOpening = useMutation({
    mutationFn: async ({ elementId, ...formData }: OpeningFormData & { elementId: string }) => {
      const { data, error } = await supabase
        .from('element_openings')
        .insert({
          element_id: elementId,
          opening_type: formData.opening_type,
          name: formData.name || null,
          width_m: formData.width_m,
          height_m: formData.height_m,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ElementOpening;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['element-openings', variables.elementId] });
      queryClient.invalidateQueries({ queryKey: ['calculated-parameters'] });
      toast({ title: 'Abertura adicionada' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const updateOpening = useMutation({
    mutationFn: async ({ id, elementId, ...formData }: OpeningFormData & { id: string; elementId: string }) => {
      const { data, error } = await supabase
        .from('element_openings')
        .update({
          opening_type: formData.opening_type,
          name: formData.name || null,
          width_m: formData.width_m,
          height_m: formData.height_m,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ElementOpening;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['element-openings', variables.elementId] });
      queryClient.invalidateQueries({ queryKey: ['calculated-parameters'] });
      toast({ title: 'Abertura atualizada' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteOpening = useMutation({
    mutationFn: async ({ id, elementId }: { id: string; elementId: string }) => {
      const { error } = await supabase
        .from('element_openings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { elementId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['element-openings', result.elementId] });
      queryClient.invalidateQueries({ queryKey: ['calculated-parameters'] });
      toast({ title: 'Abertura eliminada' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // =====================================================
  // PARÂMETROS CALCULADOS
  // =====================================================

  const getCalculatedParams = (elementId: string) => {
    return useQuery({
      queryKey: ['calculated-parameters', elementId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('calculated_parameters')
          .select('*')
          .eq('element_id', elementId);

        if (error) throw error;
        return data as CalculatedParameter[];
      },
      enabled: !!elementId,
    });
  };

  // =====================================================
  // REGRAS PARAMÉTRICAS
  // =====================================================

  const { data: rules = [], isLoading: isLoadingRules } = useQuery({
    queryKey: ['parametric-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parametric_rules')
        .select('*')
        .order('element_type', { ascending: true })
        .order('construction_method', { ascending: true })
        .order('rule_name', { ascending: true });

      if (error) throw error;
      return data as ParametricRule[];
    },
  });

  const getRulesForElement = (element: ConstructiveElement | null) => {
    if (!element) return [];
    return rules.filter(
      (rule) =>
        rule.element_type === element.element_type &&
        rule.construction_method === element.construction_method
    );
  };

  // =====================================================
  // LINKAR ARTIGO A ELEMENTO
  // =====================================================

  const linkArtigoToElement = useMutation({
    mutationFn: async ({
      artigoId,
      elementId,
      ruleId,
    }: {
      artigoId: string;
      elementId: string;
      ruleId: string;
    }) => {
      // Executar regra para obter quantidade
      const { data: quantityResult, error: rpcError } = await supabase.rpc(
        'execute_parametric_rule',
        {
          p_rule_id: ruleId,
          p_element_id: elementId,
        }
      );

      if (rpcError) throw rpcError;

      const quantity = quantityResult as number;

      // Obter preço unitário do artigo
      const { data: artigo, error: artigoError } = await supabase
        .from('artigos_orcamento')
        .select('preco_unitario')
        .eq('id', artigoId)
        .single();

      if (artigoError) throw artigoError;

      // Atualizar artigo com quantidade paramétrica
      const { data, error } = await supabase
        .from('artigos_orcamento')
        .update({
          quantity_source: 'parametric',
          linked_element_id: elementId,
          linked_rule_id: ruleId,
          quantidade: quantity,
          valor_total: quantity * artigo.preco_unitario,
        })
        .eq('id', artigoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento'] });
      toast({
        title: 'Artigo linkado',
        description: 'Quantidade calculada automaticamente a partir do elemento',
      });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const unlinkArtigoFromElement = useMutation({
    mutationFn: async (artigoId: string) => {
      const { data, error } = await supabase
        .from('artigos_orcamento')
        .update({
          quantity_source: 'manual',
          linked_element_id: null,
          linked_rule_id: null,
        })
        .eq('id', artigoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento'] });
      toast({ title: 'Artigo desvinculado', description: 'Quantidade agora é manual' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // =====================================================
  // VALIDAÇÃO
  // =====================================================

  const validateElement = async (elementId: string): Promise<ValidationResult[]> => {
    const { data, error } = await supabase.rpc('validate_element_parameters', {
      p_element_id: elementId,
    });

    if (error) throw error;
    return (data as ValidationResult[]) || [];
  };

  // =====================================================
  // ARTIGOS LINKADOS
  // =====================================================

  const getLinkedArtigos = (elementId: string) => {
    return useQuery({
      queryKey: ['linked-artigos', elementId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('artigos_orcamento')
          .select('*, parametric_rules!linked_rule_id(rule_name, unit)')
          .eq('linked_element_id', elementId)
          .eq('quantity_source', 'parametric');

        if (error) throw error;
        return data;
      },
      enabled: !!elementId,
    });
  };

  return {
    // Elementos
    elements,
    isLoadingElements,
    refetchElements,
    createElement,
    updateElement,
    deleteElement,

    // Aberturas
    getOpenings,
    createOpening,
    updateOpening,
    deleteOpening,

    // Parâmetros calculados
    getCalculatedParams,

    // Regras
    rules,
    isLoadingRules,
    getRulesForElement,

    // Linking
    linkArtigoToElement,
    unlinkArtigoFromElement,

    // Validação
    validateElement,

    // Artigos linkados
    getLinkedArtigos,
  };
}

// Hook auxiliar para usar aberturas de um elemento específico
export function useElementOpenings(elementId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: openings = [], isLoading } = useQuery({
    queryKey: ['element-openings', elementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('element_openings')
        .select('*')
        .eq('element_id', elementId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ElementOpening[];
    },
    enabled: !!elementId,
  });

  const createOpening = useMutation({
    mutationFn: async (formData: OpeningFormData) => {
      const { data, error } = await supabase
        .from('element_openings')
        .insert({
          element_id: elementId,
          opening_type: formData.opening_type,
          name: formData.name || null,
          width_m: formData.width_m,
          height_m: formData.height_m,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ElementOpening;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['element-openings', elementId] });
      queryClient.invalidateQueries({ queryKey: ['calculated-parameters', elementId] });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteOpening = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('element_openings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['element-openings', elementId] });
      queryClient.invalidateQueries({ queryKey: ['calculated-parameters', elementId] });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  return { openings, isLoading, createOpening, deleteOpening };
}

// Hook auxiliar para parâmetros calculados
export function useCalculatedParameters(elementId: string) {
  const { data: params = [], isLoading } = useQuery({
    queryKey: ['calculated-parameters', elementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calculated_parameters')
        .select('*')
        .eq('element_id', elementId);

      if (error) throw error;
      return data as CalculatedParameter[];
    },
    enabled: !!elementId,
  });

  // Helper para obter valor de um parâmetro específico
  const getParamValue = (key: string): number => {
    const param = params.find((p) => p.key === key);
    return param?.value ?? 0;
  };

  return { params, isLoading, getParamValue };
}
