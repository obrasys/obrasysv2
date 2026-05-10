import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Persistência da análise Axia™ por página da planta.
 *
 * - Lê de `plan_pages.axia_analysis` (fonte de verdade).
 * - Fallback de leitura: `localStorage.plan-axia-results:${planId}` (compatibilidade).
 * - Após primeira gravação na DB, limpa o valor antigo do localStorage.
 *
 * Indexado por `page_number` para manter compatibilidade com o estado existente em PlanDetail.
 */
export interface PlanAxiaPagePersistedRow {
  page_number: number;
  page_id: string;
  axia_analysis: any | null;
  axia_analyzed_at: string | null;
  axia_model: string | null;
  axia_risk_level: string | null;
  axia_review_required: boolean;
}

export function usePlanAxiaPersistence(planImportId?: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const migratedRef = useRef(false);

  // Carrega todas as páginas da planta com a respetiva análise Axia
  const pagesQuery = useQuery({
    queryKey: ["plan-axia-pages", planImportId],
    queryFn: async () => {
      if (!planImportId) return [] as PlanAxiaPagePersistedRow[];
      const { data, error } = await supabase
        .from("plan_pages")
        .select("id,page_number,axia_analysis,axia_analyzed_at,axia_model,axia_risk_level,axia_review_required" as any)
        .eq("plan_import_id", planImportId)
        .order("page_number", { ascending: true });
      if (error) throw error;
      return ((data as any[]) ?? []).map((r) => ({
        page_number: r.page_number,
        page_id: r.id,
        axia_analysis: r.axia_analysis ?? null,
        axia_analyzed_at: r.axia_analyzed_at ?? null,
        axia_model: r.axia_model ?? null,
        axia_risk_level: r.axia_risk_level ?? null,
        axia_review_required: !!r.axia_review_required,
      })) as PlanAxiaPagePersistedRow[];
    },
    enabled: !!planImportId && !!user,
  });

  // Mapa pageNumber -> análise (DB com fallback localStorage)
  const [resultsByPage, setResultsByPage] = useState<Record<number, any>>({});

  // Hidrata: DB primeiro, localStorage como fallback
  useEffect(() => {
    if (!planImportId) return;
    const fromDb: Record<number, any> = {};
    for (const p of pagesQuery.data ?? []) {
      if (p.axia_analysis) fromDb[p.page_number] = p.axia_analysis;
    }
    if (Object.keys(fromDb).length > 0) {
      setResultsByPage(fromDb);
      return;
    }
    // Fallback localStorage
    try {
      const raw = localStorage.getItem(`plan-axia-results:${planImportId}`);
      if (raw) setResultsByPage(JSON.parse(raw));
    } catch { /* noop */ }
  }, [planImportId, pagesQuery.data]);

  // Helper para garantir page_id (cria a linha em plan_pages se não existir)
  const ensurePageId = useCallback(
    async (pageNumber: number, floorId?: string | null): Promise<string | null> => {
      if (!planImportId || !user) return null;
      const existing = (pagesQuery.data ?? []).find((p) => p.page_number === pageNumber);
      if (existing) return existing.page_id;
      const { data, error } = await supabase
        .from("plan_pages")
        .upsert({
          plan_import_id: planImportId,
          user_id: user.id,
          page_number: pageNumber,
          floor_id: floorId ?? null,
        } as any, { onConflict: "plan_import_id,page_number" } as any)
        .select("id")
        .single();
      if (error) {
        console.error("[axia-persist] ensurePageId failed", error);
        return null;
      }
      qc.invalidateQueries({ queryKey: ["plan-axia-pages", planImportId] });
      qc.invalidateQueries({ queryKey: ["plan-pages", planImportId] });
      return (data as any).id as string;
    },
    [planImportId, user, pagesQuery.data, qc],
  );

  // Grava análise para uma página (e limpa a entrada equivalente do localStorage)
  const saveAnalysis = useCallback(
    async (pageNumber: number, analysis: any, opts?: {
      model?: string;
      riskLevel?: "baixo" | "medio" | "alto" | string;
      reviewRequired?: boolean;
      floorId?: string | null;
    }) => {
      if (!planImportId) return;
      try {
        const pageId = await ensurePageId(pageNumber, opts?.floorId);
        if (!pageId) throw new Error("Não foi possível obter a página");

        const { error } = await supabase
          .from("plan_pages")
          .update({
            axia_analysis: analysis,
            axia_analyzed_at: new Date().toISOString(),
            axia_model: opts?.model ?? null,
            axia_risk_level: opts?.riskLevel ?? null,
            axia_review_required: !!opts?.reviewRequired,
          } as any)
          .eq("id", pageId);
        if (error) throw error;

        setResultsByPage((prev) => ({ ...prev, [pageNumber]: analysis }));
        qc.invalidateQueries({ queryKey: ["plan-axia-pages", planImportId] });

        // Limpa apenas esta página do localStorage antigo, sem perder outras páginas ainda não migradas
        try {
          const key = `plan-axia-results:${planImportId}`;
          const raw = localStorage.getItem(key);
          if (raw) {
            const obj = JSON.parse(raw);
            if (obj && typeof obj === "object" && pageNumber in obj) {
              delete obj[pageNumber];
              if (Object.keys(obj).length === 0) localStorage.removeItem(key);
              else localStorage.setItem(key, JSON.stringify(obj));
            }
          }
        } catch { /* noop */ }

        migratedRef.current = true;
      } catch (e: any) {
        console.error("[axia-persist] saveAnalysis failed", e);
        // Não apaga análise existente — mantém o módulo funcional
        // Mensagem amigável fica a cargo do chamador (toast contextual)
      }
    },
    [planImportId, ensurePageId, qc],
  );

  const clearAnalysis = useCallback(async (pageNumber: number) => {
    if (!planImportId) return;
    const pageId = await ensurePageId(pageNumber);
    if (!pageId) return;
    await supabase
      .from("plan_pages")
      .update({
        axia_analysis: null,
        axia_analyzed_at: null,
        axia_review_required: false,
      } as any)
      .eq("id", pageId);
    setResultsByPage((prev) => {
      const next = { ...prev };
      delete next[pageNumber];
      return next;
    });
    qc.invalidateQueries({ queryKey: ["plan-axia-pages", planImportId] });
  }, [planImportId, ensurePageId, qc]);

  const getPageMetadata = useCallback(
    (pageNumber: number) => (pagesQuery.data ?? []).find((p) => p.page_number === pageNumber) ?? null,
    [pagesQuery.data],
  );

  return {
    resultsByPage,
    isLoading: pagesQuery.isLoading,
    saveAnalysis,
    clearAnalysis,
    ensurePageId,
    getPageMetadata,
    pages: pagesQuery.data ?? [],
  };
}
