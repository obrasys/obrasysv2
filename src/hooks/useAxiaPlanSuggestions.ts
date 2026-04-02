import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PlanMeasurement, PlanMeasurementMapping } from "@/types/plan-measurements";

export interface PlanSuggestion {
  id: string;
  type: "add_complementary" | "unit_mismatch" | "duplicate_zone" | "value_incoherence" | "missing_mapping";
  severity: "info" | "warning" | "error";
  title: string;
  message: string;
  related_measurement?: string;
  suggested_article?: string;
  dismissed?: boolean;
}

interface Article {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
}

export function useAxiaPlanSuggestions() {
  const { session } = useAuth();
  const [suggestions, setSuggestions] = useState<PlanSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(
    async ({
      obraId,
      tipoObra,
      measurements,
      mappings,
      articles,
    }: {
      obraId: string;
      tipoObra?: string;
      measurements: PlanMeasurement[];
      mappings: PlanMeasurementMapping[];
      articles: Article[];
    }) => {
      if (!session?.access_token || measurements.length === 0) return;

      setLoading(true);
      setError(null);

      try {
        // Build enriched mappings with article info
        const articleMap = new Map(articles.map((a) => [a.id, a]));
        const enrichedMappings = mappings.map((mp) => {
          const measurement = measurements.find((m) => m.id === mp.measurement_id);
          const article = mp.artigo_base_id ? articleMap.get(mp.artigo_base_id) : null;
          return {
            etiqueta: measurement?.etiqueta || measurement?.tipo,
            tipo: measurement?.tipo,
            artigo_codigo: article?.codigo,
            artigo_descricao: article?.descricao,
            estado: mp.estado,
          };
        });

        const { data, error: fnError } = await supabase.functions.invoke("axia-plan-suggestions", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            obra_id: obraId,
            tipo_obra: tipoObra,
            measurements,
            existing_mappings: enrichedMappings,
          },
        });

        if (fnError) throw fnError;

        const result = data as { suggestions?: any[]; error?: string };
        if (result.error) {
          setError(result.error);
          return;
        }

        const mapped: PlanSuggestion[] = (result.suggestions || []).map((s: any, i: number) => ({
          id: `axia-plan-${Date.now()}-${i}`,
          type: s.type,
          severity: s.severity || "info",
          title: s.title,
          message: s.message,
          related_measurement: s.related_measurement,
          suggested_article: s.suggested_article,
          dismissed: false,
        }));

        setSuggestions(mapped);
      } catch (err: any) {
        console.error("Axia plan suggestions error:", err);
        setError(err.message || "Erro ao obter sugestões");
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, dismissed: true } : s)));
  }, []);

  return {
    suggestions,
    loading,
    error,
    fetchSuggestions,
    dismissSuggestion,
  };
}
