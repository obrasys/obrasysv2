import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  DEFAULT_CHECKLIST,
  type IcfAnalysisSnapshot,
  type IcfChecklistItem,
  type IcfDocumentCategory,
  type IcfProjectAnalysis,
  type IcfProjectDocument,
  type IcfProjectIssue,
} from '@/types/icf-dossier';
import type {
  ICFAccessoryEstimate,
  ICFWallCompositionResult,
  ICFWallPanel,
} from '@/types/icf-homeblock';

const T_ANALYSES = 'icf_project_analyses' as const;
const T_DOCS = 'icf_project_documents' as const;
const T_CHECKLIST = 'icf_project_checklist_items' as const;
const T_ISSUES = 'icf_project_issues' as const;
const T_SNAPSHOTS = 'icf_analysis_snapshots' as const;
const T_PANELS = 'icf_wall_panels' as const;

const sb = supabase as any;

// ------- Analyses -------
export function useIcfAnalyses(obraId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['icf-analyses', obraId ?? 'all'],
    enabled: !!user,
    queryFn: async () => {
      let q = sb.from(T_ANALYSES).select('*').order('created_at', { ascending: false });
      if (obraId) q = q.eq('obra_id', obraId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as IcfProjectAnalysis[];
    },
  });
}

export function useIcfAnalysis(id?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['icf-analysis', id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data, error } = await sb.from(T_ANALYSES).select('*').eq('id', id).single();
      if (error) throw error;
      return data as IcfProjectAnalysis;
    },
  });
}

export function useCreateIcfAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      titulo: string;
      descricao?: string;
      obra_id?: string | null;
      sistema_icf?: string;
      espessura_nucleo_mm?: number;
    }) => {
      const { data, error } = await sb
        .from(T_ANALYSES)
        .insert({
          titulo: input.titulo,
          descricao: input.descricao ?? null,
          obra_id: input.obra_id ?? null,
          sistema_icf: input.sistema_icf ?? 'HOMEBLOCK',
          espessura_nucleo_mm: input.espessura_nucleo_mm ?? 150,
        })
        .select('*')
        .single();
      if (error) throw error;
      const analysis = data as IcfProjectAnalysis;

      // Seed checklist padrão
      const rows = DEFAULT_CHECKLIST.map((c, i) => ({
        analysis_id: analysis.id,
        item_key: c.key,
        item_label: c.label,
        required: c.required,
        ordem: i + 1,
      }));
      await sb.from(T_CHECKLIST).insert(rows);
      return analysis;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['icf-analyses'] });
      toast.success('Dossiê ICF criado');
    },
    onError: (e: any) => toast.error('Erro a criar dossiê', { description: e.message }),
  });
}

export function useUpdateIcfAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<IcfProjectAnalysis> }) => {
      const { error } = await sb.from(T_ANALYSES).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['icf-analysis', vars.id] });
      qc.invalidateQueries({ queryKey: ['icf-analyses'] });
    },
  });
}

export function useDeleteIcfAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from(T_ANALYSES).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['icf-analyses'] });
      toast.success('Dossiê apagado');
    },
  });
}

// ------- Documents -------
export function useIcfDocuments(analysisId?: string) {
  return useQuery({
    queryKey: ['icf-docs', analysisId],
    enabled: !!analysisId,
    queryFn: async () => {
      const { data, error } = await sb
        .from(T_DOCS)
        .select('*')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as IcfProjectDocument[];
    },
  });
}

export function useUploadIcfDocument() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      analysisId,
      file,
      userCategory,
    }: {
      analysisId: string;
      file: File;
      userCategory?: IcfDocumentCategory;
    }) => {
      if (!user) throw new Error('Sem sessão');
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/icf-dossier/${analysisId}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from('plan-files').upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (upErr) throw upErr;
      const { error: insErr } = await sb.from(T_DOCS).insert({
        analysis_id: analysisId,
        file_name: file.name,
        file_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
        user_category: userCategory ?? null,
      });
      if (insErr) throw insErr;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['icf-docs', vars.analysisId] });
    },
    onError: (e: any) => toast.error('Erro no upload', { description: e.message }),
  });
}

export function useDeleteIcfDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ doc }: { doc: IcfProjectDocument }) => {
      await supabase.storage.from('plan-files').remove([doc.file_path]).catch(() => {});
      const { error } = await sb.from(T_DOCS).delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['icf-docs', vars.doc.analysis_id] });
    },
  });
}

export function useClassifyIcfDocuments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ analysisId, documentIds }: { analysisId: string; documentIds?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('icf-complete-project-analyzer', {
        body: { analysis_id: analysisId, document_ids: documentIds },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['icf-docs', vars.analysisId] });
      qc.invalidateQueries({ queryKey: ['icf-issues', vars.analysisId] });
      qc.invalidateQueries({ queryKey: ['icf-analysis', vars.analysisId] });
      toast.success('Documentos classificados pela Axia');
    },
    onError: (e: any) => toast.error('Erro na classificação', { description: e.message }),
  });
}

// ------- Checklist -------
export function useIcfChecklist(analysisId?: string) {
  return useQuery({
    queryKey: ['icf-checklist', analysisId],
    enabled: !!analysisId,
    queryFn: async () => {
      const { data, error } = await sb
        .from(T_CHECKLIST)
        .select('*')
        .eq('analysis_id', analysisId)
        .order('ordem');
      if (error) throw error;
      return (data ?? []) as IcfChecklistItem[];
    },
  });
}

export function useUpdateChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<IcfChecklistItem> }) => {
      const { error } = await sb.from(T_CHECKLIST).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['icf-checklist'] });
    },
  });
}

// ------- Issues -------
export function useIcfIssues(analysisId?: string) {
  return useQuery({
    queryKey: ['icf-issues', analysisId],
    enabled: !!analysisId,
    queryFn: async () => {
      const { data, error } = await sb
        .from(T_ISSUES)
        .select('*')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as IcfProjectIssue[];
    },
  });
}

export function useResolveIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'resolved' | 'dismissed' | 'acknowledged' }) => {
      const { error } = await sb
        .from(T_ISSUES)
        .update({
          status,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icf-issues'] }),
  });
}

// ------- Panels (dossier-scoped) -------
export function useIcfDossierPanels(analysisId?: string) {
  return useQuery({
    queryKey: ['icf-dossier-panels', analysisId],
    enabled: !!analysisId,
    queryFn: async () => {
      const { data, error } = await sb
        .from(T_PANELS)
        .select('*')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ICFWallPanel[];
    },
  });
}

export function useCreateDossierPanel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ICFWallPanel> & { analysis_id: string; obra_id: string }) => {
      const { data, error } = await sb.from(T_PANELS).insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['icf-dossier-panels', v.analysis_id] });
      qc.invalidateQueries({ queryKey: ['icf-wall-panels'] });
      toast.success('Pano adicionado ao dossiê');
    },
    onError: (e: any) => toast.error('Erro a criar pano', { description: e.message }),
  });
}

// ------- Composition aggregation -------
export interface DossierCompositionAgg {
  panelsTotal: number;
  panelsValidated: number;
  grossAreaM2: number;
  netAreaM2: number;
  blocks: Array<{ code: string; qty: number }>;
  accessories: Array<{ code: string; name: string; qty: number; unit: string }>;
  warnings: string[];
}

export function aggregateDossierComposition(panels: ICFWallPanel[]): DossierCompositionAgg {
  const blockQty: Record<string, number> = {};
  const accQty: Record<string, { name: string; qty: number; unit: string }> = {};
  let gross = 0, net = 0;
  const warnings: string[] = [];
  let validated = 0;
  for (const p of panels) {
    gross += Number(p.gross_area_m2) || 0;
    net += Number(p.net_area_m2 ?? 0) || 0;
    if (p.status === 'validado' || p.status === 'enviado_orcamento') validated++;
    const r = p.composition_result as ICFWallCompositionResult | null;
    if (!r) {
      warnings.push(`Pano "${p.label}" sem composição calculada.`);
      continue;
    }
    blockQty[r.block_code] = (blockQty[r.block_code] || 0) + (r.estimated_final_block_qty || 0);
    for (const a of (r.accessories || []) as ICFAccessoryEstimate[]) {
      if (!accQty[a.code]) accQty[a.code] = { name: a.name, qty: 0, unit: a.unit || 'un' };
      accQty[a.code].qty += a.estimated_qty || 0;
    }
    for (const w of r.warnings || []) warnings.push(`[${p.label}] ${w}`);
  }
  return {
    panelsTotal: panels.length,
    panelsValidated: validated,
    grossAreaM2: gross,
    netAreaM2: net,
    blocks: Object.entries(blockQty).map(([code, qty]) => ({ code, qty })),
    accessories: Object.entries(accQty).map(([code, a]) => ({ code, name: a.name, qty: a.qty, unit: a.unit })),
    warnings,
  };
}

// ------- Snapshots -------
export function useIcfSnapshots(analysisId?: string) {
  return useQuery({
    queryKey: ['icf-snapshots', analysisId],
    enabled: !!analysisId,
    queryFn: async () => {
      const { data, error } = await sb
        .from(T_SNAPSHOTS)
        .select('*')
        .eq('analysis_id', analysisId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return (data ?? []) as IcfAnalysisSnapshot[];
    },
  });
}

export function useCreateIcfSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      analysisId,
      label,
      payload,
    }: { analysisId: string; label?: string; payload: unknown }) => {
      const { data: existing } = await sb
        .from(T_SNAPSHOTS)
        .select('version_number')
        .eq('analysis_id', analysisId)
        .order('version_number', { ascending: false })
        .limit(1);
      const next = ((existing?.[0]?.version_number as number) ?? 0) + 1;
      const { error } = await sb.from(T_SNAPSHOTS).insert({
        analysis_id: analysisId,
        version_number: next,
        label: label ?? `v${next}`,
        payload: payload as any,
      });
      if (error) throw error;
      return next;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['icf-snapshots', v.analysisId] });
      toast.success('Snapshot criado');
    },
    onError: (e: any) => toast.error('Erro a criar snapshot', { description: e.message }),
  });
}

// ------- Send dossier panels to budget -------
const HOMEBLOCK_FALLBACK_PRICES: Record<string, number> = {
  'HB-BLOCO-220': 14.5, 'HB-BLOCO-300': 17.9,
  'HB-TOPO-150': 2.4, 'HB-TOPO-220': 2.8,
  'HB-ESP-150': 1.2, 'HB-ESP-220': 1.3,
};
const BLOCK_NAME: Record<string, string> = {
  'HB-BLOCO-220': 'HOMEBLOCK Bloco 22 cm',
  'HB-BLOCO-300': 'HOMEBLOCK Bloco 30 cm',
  'HB-TOPO-150': 'HOMEBLOCK Topo 15 cm',
  'HB-TOPO-220': 'HOMEBLOCK Topo 22 cm',
  'HB-ESP-150': 'HOMEBLOCK Espaçador 15 cm',
  'HB-ESP-220': 'HOMEBLOCK Espaçador 22 cm',
};

export function useSendDossierToBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      analysisId,
      obraId,
      configuracaoId,
      margem_lucro = 0.2,
      iva_percent = 23,
    }: {
      analysisId: string;
      obraId: string;
      configuracaoId: string;
      margem_lucro?: number;
      iva_percent?: number;
    }) => {
      const { data: panelsData, error: pErr } = await sb
        .from(T_PANELS)
        .select('*')
        .eq('analysis_id', analysisId)
        .eq('status', 'validado');
      if (pErr) throw pErr;
      const panels = (panelsData ?? []) as unknown as ICFWallPanel[];
      if (panels.length === 0) throw new Error('Nenhum pano validado para enviar.');

      const agg = aggregateDossierComposition(panels);
      const { data: configData, error: cErr } = await supabase
        .from('icf_configuracoes')
        .select('*')
        .eq('id', configuracaoId)
        .single();
      if (cErr) throw cErr;
      const config = configData as any;

      const artigos: any[] = [];
      agg.blocks.forEach(b => {
        if (b.qty <= 0) return;
        artigos.push({
          codigo: b.code,
          descricao: BLOCK_NAME[b.code] || b.code,
          unidade: 'un',
          quantidade: b.qty,
          preco_unitario: HOMEBLOCK_FALLBACK_PRICES[b.code] ?? 0,
        });
      });
      agg.accessories.forEach(a => {
        if (a.qty <= 0) return;
        artigos.push({
          codigo: a.code,
          descricao: BLOCK_NAME[a.code] || a.name,
          unidade: a.unit,
          quantidade: Math.ceil(a.qty),
          preco_unitario: HOMEBLOCK_FALLBACK_PRICES[a.code] ?? 0,
        });
      });
      if (artigos.length === 0) throw new Error('Sem artigos - recalcule a composição dos panos.');

      const chapters = [{
        numero: 1,
        titulo: 'Sistema ICF / HOMEBLOCK',
        descricao: `Dossiê ICF · ${panels.length} pano(s) validado(s). Área bruta ${agg.grossAreaM2.toFixed(2)} m² · líquida ${agg.netAreaM2.toFixed(2)} m².`,
        artigos,
      }];

      const { data: result, error: rpcErr } = await supabase.rpc(
        'generate_icf_budget_transactional',
        {
          p_obra_id: obraId,
          p_configuracao_id: configuracaoId,
          p_titulo: `Dossiê ICF - ${config.nome}`,
          p_margem_lucro: margem_lucro,
          p_custos_indiretos: { estaleiro: 0, seguros: 0, licenciamento: 0, iva_percent, indiretos_percent: 0 },
          p_chapters: chapters as any,
          p_config_snapshot: {
            id: config.id, nome: config.nome, versao: config.versao,
            espessura_nucleo: config.espessura_nucleo,
            classe_betao: config.classe_betao, classe_aco: config.classe_aco,
          } as any,
          p_resumo_snapshot: {
            source: 'icf_dossier',
            analysis_id: analysisId,
            panels_count: panels.length,
            gross_area_m2: agg.grossAreaM2,
            net_area_m2: agg.netAreaM2,
            warnings: agg.warnings,
          } as any,
        } as any,
      );
      if (rpcErr) throw rpcErr;

      await sb.from(T_PANELS).update({ status: 'enviado_orcamento' })
        .in('id', panels.map(p => p.id));
      await sb.from(T_ANALYSES).update({ status: 'enviado_orcamento' }).eq('id', analysisId);

      return result as { orcamento_id: string; codigo: string };
    },
    onSuccess: (out, v) => {
      qc.invalidateQueries({ queryKey: ['icf-dossier-panels', v.analysisId] });
      qc.invalidateQueries({ queryKey: ['icf-analysis', v.analysisId] });
      toast.success('Orçamento gerado', { description: `Código ${out.codigo}` });
    },
    onError: (e: any) => toast.error('Erro a enviar para orçamento', { description: e.message }),
  });
}
