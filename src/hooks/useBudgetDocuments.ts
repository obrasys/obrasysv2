import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { BudgetDocument } from '@/types/orcamentos';

export function useBudgetDocuments(budgetId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['budget-documents', budgetId],
    queryFn: async () => {
      if (!budgetId) return [];
      const { data, error } = await supabase
        .from('budget_documents')
        .select('*')
        .eq('budget_id', budgetId)
        .order('generated_at', { ascending: false });
      if (error) throw error;
      return data as BudgetDocument[];
    },
    enabled: !!budgetId,
  });

  const saveDocument = useMutation({
    mutationFn: async ({
      budgetId,
      viewMode,
      blob,
      sentToEmail,
    }: {
      budgetId: string;
      viewMode: string;
      blob: Blob;
      sentToEmail?: string;
    }) => {
      if (!user?.id) throw new Error('Não autenticado');

      const filename = `${user.id}/${budgetId}/${viewMode}-${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('budget-documents')
        .upload(filename, blob, { contentType: 'application/pdf' });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('budget_documents')
        .insert({
          user_id: user.id,
          budget_id: budgetId,
          document_type: 'pdf',
          view_mode: viewMode,
          storage_path: filename,
          sent_to_email: sentToEmail || null,
          sent_at: sentToEmail ? new Date().toISOString() : null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-documents', budgetId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao guardar documento', description: err.message, variant: 'destructive' });
    },
  });

  const downloadDocument = async (storagePath: string) => {
    const { data, error } = await supabase.storage
      .from('budget-documents')
      .createSignedUrl(storagePath, 300);
    if (error) throw error;
    window.open(data.signedUrl, '_blank');
  };

  return { documents, isLoading, saveDocument, downloadDocument };
}
