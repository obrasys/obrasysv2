import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface RoomTemplate {
  id: string;
  user_id: string;
  nome: string;
  tipo_compartimento: string;
  artigos: Array<{ artigo_base_id: string; descricao: string; unidade: string }>;
  pe_direito_m: number;
  created_at: string;
}

const DEFAULT_TEMPLATES: Omit<RoomTemplate, "id" | "user_id" | "created_at">[] = [
  {
    nome: "Cozinha Tipo",
    tipo_compartimento: "servico",
    pe_direito_m: 2.70,
    artigos: [],
  },
  {
    nome: "WC Completo",
    tipo_compartimento: "servico",
    pe_direito_m: 2.50,
    artigos: [],
  },
  {
    nome: "Quarto Standard",
    tipo_compartimento: "habitacao",
    pe_direito_m: 2.70,
    artigos: [],
  },
  {
    nome: "Sala de Estar",
    tipo_compartimento: "habitacao",
    pe_direito_m: 2.70,
    artigos: [],
  },
  {
    nome: "Hall / Corredor",
    tipo_compartimento: "circulacao",
    pe_direito_m: 2.50,
    artigos: [],
  },
];

export function usePlanRoomTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["plan-room-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_room_templates")
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        artigos: Array.isArray(t.artigos) ? t.artigos : [],
      })) as RoomTemplate[];
    },
    enabled: !!user,
  });

  const createTemplate = useMutation({
    mutationFn: async (input: {
      nome: string;
      tipo_compartimento: string;
      artigos?: Array<{ artigo_base_id: string; descricao: string; unidade: string }>;
      pe_direito_m?: number;
    }) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("plan_room_templates")
        .insert({
          user_id: user.id,
          nome: input.nome,
          tipo_compartimento: input.tipo_compartimento,
          artigos: (input.artigos || []) as any,
          pe_direito_m: input.pe_direito_m ?? 2.70,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-room-templates"] });
      toast.success("Template criado");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_room_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-room-templates"] });
      toast.success("Template eliminado");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const rows = DEFAULT_TEMPLATES.map((t) => ({
        user_id: user.id,
        nome: t.nome,
        tipo_compartimento: t.tipo_compartimento,
        artigos: t.artigos as any,
        pe_direito_m: t.pe_direito_m,
      }));
      const { error } = await supabase.from("plan_room_templates").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-room-templates"] });
      toast.success("Templates padrão criados");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    createTemplate,
    deleteTemplate,
    seedDefaults,
    defaultTemplates: DEFAULT_TEMPLATES,
  };
}
