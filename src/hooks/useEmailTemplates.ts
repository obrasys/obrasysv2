import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmailTemplate, EmailTemplateFormData } from "@/types/email-templates";
import { useToast } from "@/hooks/use-toast";

export const useEmailTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const templateQuery = (slug: string) => useQuery({
    queryKey: ["email-template", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) throw error;
      return data as EmailTemplate;
    },
    enabled: !!slug,
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmailTemplateFormData> }) => {
      const { data: result, error } = await supabase
        .from("email_templates")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({
        title: "Template atualizado",
        description: "As alterações foram guardadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: EmailTemplateFormData) => {
      const { data: result, error } = await supabase
        .from("email_templates")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({
        title: "Template criado",
        description: "O novo template foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({
        title: "Template eliminado",
        description: "O template foi eliminado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao eliminar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error,
    templateQuery,
    updateTemplate: updateTemplateMutation.mutate,
    createTemplate: createTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    isUpdating: updateTemplateMutation.isPending,
    isCreating: createTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
  };
};
