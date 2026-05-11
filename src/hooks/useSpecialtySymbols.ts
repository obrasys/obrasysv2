import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SpecialtySymbol, SpecialtyType } from "@/types/especialidades";

export function useSpecialtySymbols(specialtyType?: SpecialtyType) {
  return useQuery({
    queryKey: ["specialty-symbols", specialtyType ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("specialty_symbol_library" as any)
        .select("*")
        .eq("active", true)
        .order("symbol_name", { ascending: true });
      if (specialtyType) q = q.eq("specialty_type", specialtyType);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SpecialtySymbol[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
