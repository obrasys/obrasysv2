import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface QualitySpec {
  id: string;
  organization_id: string;
  spec_key: string;
  label: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

async function getOrgId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: mem } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", data.user.id)
    .limit(1)
    .maybeSingle();
  return mem?.organization_id ?? null;
}

export function useQualitySpecsCatalog() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const list = useQuery({
    queryKey: ["quality-specs-catalog"],
    queryFn: async (): Promise<QualitySpec[]> => {
      const orgId = await getOrgId();
      if (!orgId) return [];

      let { data, error } = await supabase
        .from("org_quality_specs_catalog")
        .select("*")
        .eq("organization_id", orgId)
        .order("ordem", { ascending: true });
      if (error) throw error;

      // Auto-seed se vazio
      if (!data || data.length === 0) {
        await supabase.rpc("seed_quality_specs_catalog", { p_org_id: orgId });
        const res = await supabase
          .from("org_quality_specs_catalog")
          .select("*")
          .eq("organization_id", orgId)
          .order("ordem", { ascending: true });
        data = res.data ?? [];
      }
      return data as QualitySpec[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: { id?: string; spec_key: string; label: string; ordem?: number; ativo?: boolean }) => {
      const orgId = await getOrgId();
      if (!orgId) throw new Error("Sem organização");
      if (payload.id) {
        const { error } = await supabase
          .from("org_quality_specs_catalog")
          .update({ spec_key: payload.spec_key, label: payload.label, ordem: payload.ordem ?? 0, ativo: payload.ativo ?? true })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("org_quality_specs_catalog").insert({
          organization_id: orgId,
          spec_key: payload.spec_key,
          label: payload.label,
          ordem: payload.ordem ?? 0,
          ativo: payload.ativo ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality-specs-catalog"] });
      toast({ title: "Rúbrica gravada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("org_quality_specs_catalog").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quality-specs-catalog"] }),
  });

  return { list, upsert, remove };
}
