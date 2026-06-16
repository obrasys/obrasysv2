import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BillingDocument, BillingDocumentLine, BillingSourceType, BillingDocumentType } from "../types";

export function useBillingDocuments(obraId?: string) {
  return useQuery({
    queryKey: ["billing-documents", obraId ?? "all"],
    queryFn: async (): Promise<BillingDocument[]> => {
      let q = supabase.from("billing_documents").select("*").order("created_at", { ascending: false });
      if (obraId) q = q.eq("obra_id", obraId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as BillingDocument[];
    },
    enabled: !obraId || !!obraId,
  });
}

export function useBillingDocumentLines(documentId?: string) {
  return useQuery({
    queryKey: ["billing-document-lines", documentId],
    queryFn: async (): Promise<BillingDocumentLine[]> => {
      const { data, error } = await supabase
        .from("billing_document_lines")
        .select("*")
        .eq("document_id", documentId!)
        .order("line_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BillingDocumentLine[];
    },
    enabled: !!documentId,
  });
}

export interface PrepareDocumentInput {
  obra_id: string;
  source_type: BillingSourceType;
  source_id: string;
  document_type: BillingDocumentType;
  integration_id?: string;
  cliente_id?: string;
  notes?: string;
}

export function usePrepareBillingDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PrepareDocumentInput) => {
      const { data, error } = await supabase.functions.invoke(
        "billing-prepare-document",
        { body: input },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing-documents"] }),
  });
}

export function useIssueBillingDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "billing-issue-document",
        { body: { document_id: documentId } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing-documents"] }),
  });
}

export function useSyncBillingDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "billing-sync-document-status",
        { body: { document_id: documentId } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing-documents"] }),
  });
}

export function useCreateBillingCreditNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "billing-create-credit-note",
        { body: { document_id: documentId } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing-documents"] }),
  });
}

export function useGetBillingDocumentPdf() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "billing-get-document-pdf",
        { body: { document_id: documentId } },
      );
      if (error) throw error;
      return data as { url?: string; mode?: string };
    },
  });
}

export function useBillingSyncLogs(documentId?: string, limit = 50) {
  return useQuery({
    queryKey: ["billing-sync-logs", documentId, limit],
    queryFn: async () => {
      let q = supabase
        .from("billing_sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (documentId) q = q.eq("document_id", documentId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
