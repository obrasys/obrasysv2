import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  DEFAULT_CHECKLIST,
  type IcfChecklistItem,
  type IcfDocumentCategory,
  type IcfProjectAnalysis,
  type IcfProjectDocument,
  type IcfProjectIssue,
} from '@/types/icf-dossier';

const T_ANALYSES = 'icf_project_analyses' as const;
const T_DOCS = 'icf_project_documents' as const;
const T_CHECKLIST = 'icf_project_checklist_items' as const;
const T_ISSUES = 'icf_project_issues' as const;

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
