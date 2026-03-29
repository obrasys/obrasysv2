import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AISearchResult {
  nome: string;
  descricao?: string;
  categoria: string;
  unidade: string;
  preco_minimo: number;
  preco_maximo: number;
  preco_medio: number;
  confianca: number;
  fonte: string;
  notas?: string;
}

export interface AISearchResponse {
  materials: AISearchResult[];
  resumo: string;
  data_referencia: string;
}

export function useAIPriceSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<AISearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, category?: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "research-material-prices",
        {
          body: { query, category },
        }
      );

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Erro na pesquisa");

      setResults(data.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return { search, isSearching, results, error, clear };
}
