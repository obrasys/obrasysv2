import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  Region,
  MaterialCategory,
  Material,
  PriceSource,
  MaterialPriceRaw,
  MaterialPriceReference,
  PriceAuditLog,
  PriceInputFormData,
  PriceFilters,
} from "@/types/base-precos";

// Hook para buscar regiões ativas
export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regions")
        .select("*")
        .eq("ativa", true)
        .order("nome");

      if (error) throw error;
      return data as Region[];
    },
  });
}

// Hook para buscar categorias de materiais
export function useMaterialCategories() {
  return useQuery({
    queryKey: ["material_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_categories")
        .select("*")
        .eq("ativa", true)
        .order("ordem");

      if (error) throw error;
      return data as MaterialCategory[];
    },
  });
}

// Hook para buscar materiais com filtros
export function useMaterials(filters?: PriceFilters) {
  return useQuery({
    queryKey: ["materials", filters],
    queryFn: async () => {
      let query = supabase
        .from("materials")
        .select(`
          *,
          category:material_categories(*)
        `)
        .eq("ativo", true)
        .order("nome");

      if (filters?.category_id) {
        query = query.eq("category_id", filters.category_id);
      }

      if (filters?.search) {
        query = query.or(
          `nome.ilike.%${filters.search}%,codigo.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Material[];
    },
  });
}

// Hook para buscar fontes de preços
export function usePriceSources() {
  return useQuery({
    queryKey: ["price_sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_sources")
        .select("*")
        .eq("ativa", true)
        .order("nome");

      if (error) throw error;
      return data as PriceSource[];
    },
  });
}

// Hook para buscar preços de referência (READ-ONLY)
export function useMaterialPriceReferences(filters?: PriceFilters) {
  return useQuery({
    queryKey: ["material_price_references", filters],
    queryFn: async () => {
      let query = supabase
        .from("material_price_reference")
        .select(`
          *,
          material:materials(*, category:material_categories(*)),
          region:regions(*)
        `)
        .order("ultima_atualizacao", { ascending: false });

      if (filters?.region_id) {
        query = query.eq("region_id", filters.region_id);
      }

      if (filters?.min_confidence) {
        query = query.gte("confidence_score", filters.min_confidence);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filtrar por categoria se especificado
      let result = data as MaterialPriceReference[];
      if (filters?.category_id) {
        result = result.filter(
          (p) => p.material?.category_id === filters.category_id
        );
      }

      // Filtrar por pesquisa
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(
          (p) =>
            p.material?.nome.toLowerCase().includes(searchLower) ||
            p.material?.codigo.toLowerCase().includes(searchLower)
        );
      }

      return result;
    },
  });
}

// Hook para buscar preços brutos (histórico - ADMIN ou próprios)
export function useMaterialPriceRaw(materialId?: string, regionId?: string) {
  return useQuery({
    queryKey: ["material_price_raw", materialId, regionId],
    queryFn: async () => {
      let query = supabase
        .from("material_price_raw")
        .select(`
          *,
          material:materials(*),
          region:regions(*),
          source:price_sources(*)
        `)
        .order("created_at", { ascending: false });

      if (materialId) {
        query = query.eq("material_id", materialId);
      }

      if (regionId) {
        query = query.eq("region_id", regionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MaterialPriceRaw[];
    },
    enabled: !!materialId || !!regionId,
  });
}

// Hook para buscar todos os preços brutos (ADMIN)
export function useAllMaterialPriceRaw() {
  return useQuery({
    queryKey: ["material_price_raw_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_price_raw")
        .select(`
          *,
          material:materials(*, category:material_categories(*)),
          region:regions(*),
          source:price_sources(*)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as MaterialPriceRaw[];
    },
  });
}

// Hook para buscar log de auditoria (ADMIN)
export function usePriceAuditLog(materialId?: string) {
  return useQuery({
    queryKey: ["price_audit_log", materialId],
    queryFn: async () => {
      let query = supabase
        .from("price_audit_log")
        .select(`
          *,
          material:materials(*),
          region:regions(*)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (materialId) {
        query = query.eq("material_id", materialId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PriceAuditLog[];
    },
  });
}

// Mutation para inserir preço bruto
export function useInsertPriceRaw() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (formData: PriceInputFormData) => {
      if (!user) throw new Error("Utilizador não autenticado");

      const { data, error } = await supabase
        .from("material_price_raw")
        .insert({
          material_id: formData.material_id,
          region_id: formData.region_id,
          source_id: formData.source_id,
          user_id: user.id,
          preco: formData.preco,
          unidade_original: formData.unidade_original,
          preco_normalizado: formData.preco, // Por simplicidade, assume mesma unidade
          observacoes: formData.observacoes || null,
          data_referencia: formData.data_referencia || new Date().toISOString().split("T")[0],
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material_price_raw"] });
      toast.success("Preço inserido com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao inserir preço:", error);
      toast.error("Erro ao inserir preço. Tente novamente.");
    },
  });
}
