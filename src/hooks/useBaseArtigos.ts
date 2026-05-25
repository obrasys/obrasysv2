import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export type TipoBase = "geral" | "remodelacao";

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
  tipo_base: TipoBase;
  tipo_linha: string | null;
}

export interface BaseArtigoUser extends BaseArtigoGlobal {
  organization_id: string;
  user_id: string;
  global_artigo_id: string | null;
  origem: "global" | "csv" | "manual";
}

export function useBaseArtigosGlobal(search?: string, tipoBase: TipoBase = "geral") {
  return useQuery({
    queryKey: ["base_artigos_global", tipoBase, search],
    queryFn: async () => {
      let q = supabase
        .from("base_artigos_global" as any)
        .select("*")
        .eq("ativo", true)
        .eq("tipo_base", tipoBase)
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

/**
 * Hook for the Essencial wizard / Avançado catalog: fetches base_artigos_user
 * filtered by tipo_base, optional capítulo keywords (OR ilike) and search.
 */
export function useBaseArtigosForArea(opts: {
  tipoBase: TipoBase;
  capituloKeywords?: string[];
  search?: string;
  enabled?: boolean;
}) {
  const { tipoBase, capituloKeywords = [], search, enabled = true } = opts;
  return useQuery({
    queryKey: ["base_artigos_user_area", tipoBase, capituloKeywords.join("|"), search],
    queryFn: async () => {
      let q = supabase
        .from("base_artigos_user" as any)
        .select("*")
        .eq("tipo_base", tipoBase)
        .order("capitulo")
        .order("codigo");
      if (capituloKeywords.length > 0) {
        const ors = capituloKeywords.map((k) => `capitulo.ilike.%${k}%`).join(",");
        q = q.or(ors);
      }
      if (search?.trim()) {
        q = q.or(
          `codigo.ilike.%${search}%,artigo.ilike.%${search}%,capitulo.ilike.%${search}%`
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BaseArtigoUser[];
    },
    enabled,
  });
}

export function useBaseArtigosUser(search?: string, tipoBase: TipoBase = "geral") {
  return useQuery({
    queryKey: ["base_artigos_user", tipoBase, search],
    queryFn: async () => {
      let q = supabase
        .from("base_artigos_user" as any)
        .select("*")
        .eq("tipo_base", tipoBase)
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
    mutationFn: async (tipoBase: TipoBase = "geral") => {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;
      if (!user) throw new Error("Sessão expirada.");

      const { data: orgId, error: orgErr } = await supabase.rpc("get_user_org_id" as any);
      if (orgErr || !orgId) throw new Error("Organização não encontrada.");

      const { data: globais, error: gErr } = await supabase
        .from("base_artigos_global" as any)
        .select("*")
        .eq("ativo", true)
        .eq("tipo_base", tipoBase);
      if (gErr) throw gErr;

      if (!globais || globais.length === 0) return { inserted: 0 };

      const rows = (globais as any[]).map((g) => ({
        organization_id: orgId,
        user_id: user.id,
        global_artigo_id: g.id,
        origem: "global",
        tipo_base: g.tipo_base ?? tipoBase,
        tipo_linha: g.tipo_linha ?? null,
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
        .upsert(rows, { onConflict: "organization_id,tipo_base,codigo", ignoreDuplicates: true, count: "exact" });
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
    mutationFn: async (input: { file: File; tipoBase?: TipoBase }) => {
      const tipoBase: TipoBase = input.tipoBase ?? "geral";
      const name = input.file.name.toLowerCase();
      const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");
      let rows: Record<string, string>[];
      if (isExcel) {
        const buf = await input.file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        // Prefer a sheet whose name suggests "base" / "precos"; fall back to first
        const sheetName =
          wb.SheetNames.find((n) => /base|prec|artig|item/i.test(n)) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true });
        rows = json.map((r) => {
          const out: Record<string, string> = {};
          Object.entries(r).forEach(([k, v]) => {
            out[normalizeHeader(k)] = v == null ? "" : String(v).trim();
          });
          return mapAliases(out);
        }).filter((r) => r.codigo && r.artigo);
      } else {
        const text = await input.file.text();
        rows = parseCsv(text);
      }
      if (rows.length === 0) throw new Error("Ficheiro vazio ou sem linhas válidas (precisa de pelo menos código e descrição/artigo).");

      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;
      if (!user) throw new Error("Sessão expirada.");

      const { data: orgId, error: orgErr } = await supabase.rpc("get_user_org_id" as any);
      if (orgErr || !orgId) throw new Error("Organização não encontrada.");

      const payload = rows.map((r) => {
        const mo = num(r.mao_obra_estimada_eur);
        const mat = num(r.material_estimado_eur);
        let custo = num(r.custo_direto_eur);
        if (custo === 0) custo = mo + mat;
        const margem = num(r.margem_configuravel_pct, 25);
        let preco = num(r.preco_indicativo_eur);
        if (preco === 0) preco = num(r.preco_unitario);
        if (preco === 0 && custo > 0) {
          preco = margem >= 100 ? custo : custo / (1 - margem / 100);
        }
        const tipoLinha = (r.tipo_linha || r.tipolinha || "").toUpperCase() || null;

        return {
          organization_id: orgId,
          user_id: user.id,
          origem: "csv",
          tipo_base: tipoBase,
          tipo_linha: tipoLinha,
          codigo: r.codigo,
          capitulo: r.capitulo || "Sem capítulo",
          subcapitulo: r.subcapitulo || null,
          artigo: r.artigo,
          unidade: r.unidade || "un",
          mao_obra_estimada_eur: mo,
          material_estimado_eur: mat,
          custo_direto_eur: Number(custo.toFixed(2)),
          margem_configuravel_pct: margem,
          preco_indicativo_eur: Number(preco.toFixed(2)),
          fonte_base: r.fonte_base || (isExcel ? "Importação Excel" : (tipoBase === "remodelacao" ? "Importação Remodelação" : "Importação CSV")),
          estado: r.estado || "Provisório",
          observacoes: r.observacoes || null,
        };
      });

      const { error, count } = await supabase
        .from("base_artigos_user" as any)
        .upsert(payload, { onConflict: "organization_id,tipo_base,codigo", count: "exact" });
      if (error) throw error;
      return { inserted: count ?? payload.length };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["base_artigos_user"] });
      toast.success(`Importado (${r.inserted} artigos).`);
    },
    onError: (e: Error) => toast.error(`Erro ao importar: ${e.message}`),
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
  const headers = lines[0].split(delim).map((h) => normalizeHeader(h));
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delim);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return mapAliases(row);
  }).filter((r) => r.codigo && r.artigo);
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

// Normaliza cabeçalhos: minúsculas, sem acentos, espaços/símbolos → _
function normalizeHeader(h: string): string {
  return String(h)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Mapeia variantes de cabeçalho conhecidas → chaves canónicas do importador
const ALIASES: Record<string, string> = {
  // identificação
  codigo: "codigo", cod: "codigo", ref: "codigo", referencia: "codigo",
  // descrição
  artigo: "artigo", descricao: "artigo", descricao_do_item: "artigo",
  descricao_item: "artigo", designacao: "artigo", nome: "artigo", item: "artigo",
  // hierarquia
  capitulo: "capitulo", grupo: "capitulo", familia: "capitulo", categoria_principal: "capitulo",
  subcapitulo: "subcapitulo", subgrupo: "subcapitulo", categoria: "subcapitulo", subfamilia: "subcapitulo",
  // unidade
  unidade: "unidade", un: "unidade", unid: "unidade",
  // custos
  mao_de_obra_estimada: "mao_obra_estimada_eur",
  mao_obra_estimada: "mao_obra_estimada_eur",
  mao_de_obra: "mao_obra_estimada_eur",
  mao_obra: "mao_obra_estimada_eur",
  mao_obra_estimada_eur: "mao_obra_estimada_eur",
  material_estimado: "material_estimado_eur",
  material_estimado_eur: "material_estimado_eur",
  material: "material_estimado_eur",
  custo: "custo_direto_eur",
  custo_direto: "custo_direto_eur",
  custo_direto_eur: "custo_direto_eur",
  // margem
  margem: "margem_configuravel_pct",
  margem_padrao: "margem_configuravel_pct",
  margem_configuravel: "margem_configuravel_pct",
  margem_configuravel_pct: "margem_configuravel_pct",
  // preço
  preco: "preco_indicativo_eur",
  preco_unitario: "preco_indicativo_eur",
  preco_indicativo: "preco_indicativo_eur",
  preco_indicativo_eur: "preco_indicativo_eur",
  preco_venda: "preco_indicativo_eur",
  preco_venda_sugerido: "preco_indicativo_eur",
  preco_base_sem_iva: "preco_indicativo_eur",
  preco_sem_iva: "preco_indicativo_eur",
  // metadados
  fonte: "fonte_base", fonte_base: "fonte_base", fonte_url: "fonte_base",
  estado: "estado", tipo_de_preco: "estado", tipo_preco: "estado",
  observacoes: "observacoes", obs: "observacoes", notas: "observacoes",
  tipo_linha: "tipo_linha", tipolinha: "tipo_linha",
};

function mapAliases(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(row).forEach(([k, v]) => {
    const canon = ALIASES[k] || k;
    // não sobrescrever valor já preenchido por chave canónica
    if (!out[canon] || out[canon] === "") out[canon] = v;
  });
  return out;
}

