import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BillingIntegrationSafe, BillingProvider, BillingEnvironment } from "../types";

export function useBillingIntegrations() {
  return useQuery({
    queryKey: ["billing-integrations"],
    queryFn: async (): Promise<BillingIntegrationSafe[]> => {
      const { data, error } = await supabase
        .from("billing_integrations_safe")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BillingIntegrationSafe[];
    },
  });
}

export interface SaveIntegrationInput {
  id?: string;
  provider: BillingProvider;
  environment: BillingEnvironment;
  name: string;
  api_base_url?: string;
  account_id?: string;
  organization_external_id?: string;
  /** Sensitive — sent once to the edge function, never persisted in client state. */
  credentials?: Record<string, string>;
}

export function useSaveBillingIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveIntegrationInput) => {
      const { data, error } = await supabase.functions.invoke(
        "billing-test-connection",
        { body: { action: "save", ...input } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing-integrations"] }),
  });
}

export function useTestBillingConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "billing-test-connection",
        { body: { action: "test", integration_id: integrationId } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing-integrations"] }),
  });
}
