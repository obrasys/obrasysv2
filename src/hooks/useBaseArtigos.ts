import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BaseArtigoGlobal {
  id: string;
  codigo: string;
  capitulo: string;
  subcapitulo: string | null;
  artigo: string;
  unidade: string;
  mao_obra_estimada_eur: number;
  material_estimado_eur: number;
  custo_direto_eur: number;
  margem_configuravel_pct: number;
  preco_indicativo_eur: number;
  fonte_base: string | null;
  data_atualizacao: string | null;
  edicao_livre: boolean;
  estado: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export interface BaseArtigoUser extends BaseArtigoGlobal {
  organization_id: string;
  user_id: string;
  global_artigo_id: string | null;
  origem: "global" | "csv" | "manual";
}

export function useBaseArtigosGlobal(search?: string) {
  return useQuery({
    queryKey: ["base_artigos_global", search],
    queryFn: async () => {
      let q = supabase
        .from("base_artigos_global" as any)
        .select("*")
        .eq("ativo", true)
        .order("capitulo")
        .order("codigo");
      if (search?.trim()) {
        q = q.or(
          `codigo.ilike.%${search}%,artigo.ilike.%${search}%,capitulo.ilike.%${search}%`
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BaseArtigoGlobal[];
    },
  });
}

export function useBaseArtigosUser(search?: string) {
  return useQuery({
    queryKey: ["base_artigos_user", search],
    queryFn: async () => {
      let q = supabase
        .from("base_artigos_user" as any)
        .select("*")
        .order("capitulo")
        .order("codigo");
      if (search?.trim()) {
        q = q.or(
          `codigo.ilike.%${search}%,artigo.ilike.%${search}%,capitulo.ilike.%${search}%`
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BaseArtigoUser[];
    },
  });
}

export function useImportBaseGlobalToUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;
      if (!user) throw new Error("Sessão expirada.");

      const { data: orgId, error: orgErr } = await supabase.rpc("get_user_org_id" as any);
      if (orgErr || !orgId) throw new Error("Organização não encontrada.");

      const { data: globais, error: gErr } = await supabase
        .from("base_artigos_global" as any)
        .select("*")
        .eq("ativo", true);
      if (gErr) throw gErr;

      if (!globais || globais.length === 0) return { inserted: 0 };

      const rows = (globais as any[]).map((g) => ({
        organization_id: orgId,
        user_id: user.id,
        global_artigo_id: g.id,
        origem: "global",
        codigo: g.codigo,
        capitulo: g.capitulo,
        subcapitulo: g.subcapitulo,
        artigo: g.artigo,
        unidade: g.unidade,
        mao_obra_estimada_eur: g.mao_obra_estimada_eur,
        material_estimado_eur: g.material_estimado_eur,
        custo_direto_eur: g.custo_direto_eur,
        margem_configuravel_pct: g.margem_configuravel_pct,
        preco_indicativo_eur: g.preco_indicativo_eur,
        fonte_base: g.fonte_base,
        data_atualizacao: g.data_atualizacao,
        estado: g.estado,
        observacoes: g.observacoes,
      }));

      const { error: insErr, count } = await supabase
        .from("base_artigos_user" as any)
        .upsert(rows, { onConflict: "organization_id,codigo", ignoreDuplicates: true, count: "exact" });
      if (insErr) throw insErr;
      return { inserted: count ?? rows.length };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["base_artigos_user"] });
      toast.success(`Base padrão importada (${r.inserted} artigos).`);
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useImportCsvToUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) throw new Error("CSV vazio ou formato inválido.");

      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;
      if (!user) throw new Error("Sessão expirada.");

      const { data: orgId, error: orgErr } = await supabase.rpc("get_user_org_id" as any);
      if (orgErr || !orgId) throw new Error("Organização não encontrada.");

      const payload = rows.map((r) => ({
        organization_id: orgId,
        user_id: user.id,
        origem: "csv",
        codigo: r.codigo,
        capitulo: r.capitulo,
        subcapitulo: r.subcapitulo || null,
        artigo: r.artigo,
        unidade: r.unidade || "un",
        mao_obra_estimada_eur: num(r.mao_obra_estimada_eur),
        material_estimado_eur: num(r.material_estimado_eur),
        custo_direto_eur: num(r.custo_direto_eur),
        margem_configuravel_pct: num(r.margem_configuravel_pct, 25),
        preco_indicativo_eur: num(r.preco_indicativo_eur),
        fonte_base: r.fonte_base || "Importação CSV",
        estado: r.estado || "Provisório",
        observacoes: r.observacoes || null,
      }));

      const { error, count } = await supabase
        .from("base_artigos_user" as any)
        .upsert(payload, { onConflict: "organization_id,codigo", count: "exact" });
      if (error) throw error;
      return { inserted: count ?? payload.length };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["base_artigos_user"] });
      toast.success(`CSV importado (${r.inserted} artigos).`);
    },
    onError: (e: Error) => toast.error(`Erro ao importar CSV: ${e.message}`),
  });
}

export function useUpdateArtigoUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<BaseArtigoUser> }) => {
      const { error } = await supabase
        .from("base_artigos_user" as any)
        .update(input.patch as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["base_artigos_user"] });
      toast.success("Artigo atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteArtigoUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("base_artigos_user" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["base_artigos_user"] });
      toast.success("Artigo eliminado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// --------- helpers ---------
function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delim = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delim).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delim);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  }).filter((r) => r.codigo && r.artigo && r.capitulo);
}

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
    } else if (c === delim && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
