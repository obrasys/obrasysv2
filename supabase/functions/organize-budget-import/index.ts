import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveChain } from "../_shared/axia/model-router.ts";
import { AXIA_ANTI_HALLUCINATION_BLOCK } from "../_shared/axia/system-prompts.ts";
import { logAxiaCall } from "../_shared/axia/logCall.ts";
// Prompt ID/version tracked in _shared/axia/prompts.ts (ORGANIZE_BUDGET_IMPORT_*)


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/\s/g, "").replace(/€|eur/gi, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();

const normalizeUnit = (value: unknown, fallback = "un") => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["un", "uni", "unid", "unidade", "unidades"].includes(raw)) return "un";
  if (["m", "metro", "metros"].includes(raw)) return "m";
  if (["m2", "m²", "mq"].includes(raw)) return "m2";
  if (["m3", "m³"].includes(raw)) return "m3";
  if (["ml", "m.l.", "metro linear", "metros lineares"].includes(raw)) return "ml";
  if (["kg", "quilo", "quilos"].includes(raw)) return "kg";
  if (["l", "lt", "litro", "litros"].includes(raw)) return "l";
  if (["vg", "verba"].includes(raw)) return "vg";
  if (["h", "hr", "hora", "horas"].includes(raw)) return "h";
  if (["cj", "conj", "conjunto", "conj.", "conjuntos"].includes(raw)) return "cj";
  if (["lote", "lot"].includes(raw)) return "lote";
  return raw.slice(0, 12);
};

const tokenScore = (a: string, b: string) => {
  const aa = new Set(normalizeText(a).split(" ").filter((t) => t.length > 2));
  const bb = new Set(normalizeText(b).split(" ").filter((t) => t.length > 2));
  if (!aa.size || !bb.size) return 0;
  let intersection = 0;
  aa.forEach((t) => { if (bb.has(t)) intersection += 1; });
  return intersection / Math.max(aa.size, bb.size);
};

const findCatalogMatch = (
  article: { codigo?: string | null; descricao?: string | null },
  catalog: Array<{ codigo: string | null; descricao: string; unidade: string | null; preco_unitario: number }>
) => {
  const code = String(article.codigo ?? "").trim().toUpperCase();
  if (code) {
    const byCode = catalog.find((item) => String(item.codigo ?? "").trim().toUpperCase() === code);
    if (byCode) return byCode;
  }
  const desc = String(article.descricao ?? "").trim();
  if (!desc) return null;
  let best: (typeof catalog)[number] | null = null;
  let bestScore = 0;
  for (const item of catalog) {
    const score = tokenScore(desc, item.descricao);
    if (score > bestScore) { best = item; bestScore = score; }
  }
  return bestScore >= 0.55 ? best : null;
};

const isNumericLike = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;
  const cleaned = value.trim();
  if (!cleaned) return false;
  return Number.isFinite(toNumber(cleaned, Number.NaN));
};

const looksLikeCode = (value: unknown) => {
  if (typeof value === "number") return false;
  const text = String(value ?? "").trim();
  if (!text) return false;
  return /^\d+(?:[.\-]\d+){0,5}$/.test(text) || /^[A-Z]{1,4}\d+(?:[.\-]\d+)*$/i.test(text);
};

const isChapterLabel = (value: unknown) => {
  const text = String(value ?? "").trim();
  if (!text) return false;
  const normalized = normalizeText(text);
  return /^(cap(itulo)?\s*[ivxlcdm\d]+|\d+\s+[a-z].*|[a-z\s]{6,})$/i.test(text) &&
    !/(subtotal|total|iva|transporte|pagina)/i.test(normalized);
};

const isSummaryRow = (values: unknown[]) => {
  const joined = normalizeText(values.map((v) => String(v ?? "")).join(" "));
  return /(subtotal|total|iva|imposto|resumo|transporte|pagina anterior|a transportar)/.test(joined);
};

const normalizeCode = (value: unknown, fallback: string) => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const VALID_UNITS = new Set(["un", "m", "m2", "m3", "ml", "kg", "vg", "l", "h", "cj", "lote"]);
const TOTAL_KEYWORDS = /(total geral|total orçamento|total orcamento|valor total|preco global|total final|total da proposta|importa[nc]ia total)/;
const SUMMARY_KEYWORDS = /(subtotal|sub total|total|iva|imposto|resumo|transporte|pagina anterior|a transportar)/;
const HEADER_KEYWORDS = /(art\.?º|artigo|designa[cç][aã]o|descricao|descri[cç][aã]o|unid|unidade|quant|qtd|pre[cç]o|unit[aá]rio|parcial|cliente|local|obra|morada|data)/;

const sanitizeTextCell = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

const isReferenceErrorText = (value: unknown) => /#ref!?/i.test(sanitizeTextCell(value));

// Only treat a cell as "included in another article" when the cell text STARTS with
// "Incluíd…" (e.g. unit-price cell "Incluído no artigo 1.1.1.2"). This prevents
// descriptions that contain mid-sentence phrases like "(não incluída neste artigo)"
// from being wrongly discarded.
const isIncludedText = (value: unknown) => /^\s*inclu[ií]d[oa]\b/i.test(sanitizeTextCell(value));

const isProbablyHeaderRow = (values: unknown[]) => {
  const joined = normalizeText(values.map((value) => String(value ?? "")).join(" "));
  return HEADER_KEYWORDS.test(joined);
};

const isMeaningfulDescription = (value: string) => {
  if (!value) return false;
  const normalized = normalizeText(value);
  if (!normalized || SUMMARY_KEYWORDS.test(normalized) || HEADER_KEYWORDS.test(normalized)) return false;
  return /[a-z]/i.test(value) && value.length >= 3;
};

const almostEqual = (a: number, b: number, tolerance = 0.02) => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (a === 0 && b === 0) return true;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1) <= tolerance;
};

const extractRowNumbers = (values: unknown[], ignoredIndices: number[] = []) => values
  .map((value, index) => ({ index, raw: value, value: ignoredIndices.includes(index) ? Number.NaN : toNumber(value, Number.NaN) }))
  .filter((entry) => Number.isFinite(entry.value));

const detectFinalBudgetTotal = (rows: Array<Record<string, unknown>>, headers: string[] = []) => {
  const totals: Array<{ rowIndex: number; value: number; label: string }> = [];
  const normalizedHeaders = headers.map((header) => normalizeText(header));
  const totalHeaderIndex = normalizedHeaders.findIndex((header) => /(total|parcial|valor)/.test(header));

  rows.forEach((row, rowIndex) => {
    const values = Object.values(row);
    const label = normalizeText(values.map((value) => String(value ?? "")).join(" "));
    if (!TOTAL_KEYWORDS.test(label)) return;

    const numericEntries = extractRowNumbers(values);
    if (!numericEntries.length) return;

    const preferred = totalHeaderIndex >= 0
      ? numericEntries.find((entry) => entry.index === totalHeaderIndex)
      : undefined;
    const picked = preferred ?? numericEntries[numericEntries.length - 1];
    if (!picked || picked.value <= 0) return;

    totals.push({ rowIndex, value: picked.value, label });
  });

  if (!totals.length) return 0;
  return totals.sort((a, b) => (b.rowIndex - a.rowIndex) || (b.value - a.value))[0].value;
};

type ImportDiagnostics = {
  original_total: number;
  imported_total: number;
  difference: number;
  status: "ok" | "review_required";
  valid_articles: number;
  chapters_found: number;
  ignored_rows: number;
  included_rows: number;
  subtotal_rows: number;
  ref_rows: number;
  ignored_reasons: string[];
};

type OrganizedBudgetResult = {
  titulo_sugerido: string;
  capitulos: Array<{
    numero: number;
    titulo: string;
    artigos: Array<{ codigo: string; descricao: string; unidade: string; quantidade: number; preco_unitario: number }>;
  }>;
  _meta: ImportDiagnostics;
};

const deriveBudgetFromRows = (
  rows: Array<Record<string, unknown>>,
  headers: string[] | undefined,
  catalog: Array<{ codigo: string | null; descricao: string; unidade: string | null; preco_unitario: number }>,
  fileName?: string,
): OrganizedBudgetResult | null => {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const normalizedHeaders = (headers ?? []).map((h) => normalizeText(h));
  const normalizedRows = rows.map((row, rowIndex) => {
    const values = Object.values(row);
    const nextValues = rowIndex < rows.length - 1 ? Object.values(rows[rowIndex + 1]) : [];
    return Object.fromEntries((headers ?? []).map((header, colIndex) => {
      const current = sanitizeTextCell(values[colIndex]);
      const below = sanitizeTextCell(nextValues[colIndex]);
      if (!current || !below) return [header, values[colIndex] ?? null];
      if (/(pre[cç]os?|valor)/i.test(current) && /(unit[aá]rio|parcial|total)/i.test(below)) {
        return [header, `${current} ${below}`];
      }
      return [header, values[colIndex] ?? null];
    }));
  });

  const firstRowValues = rows.length > 0 ? Object.values(rows[0]) : [];
  const secondRowValues = rows.length > 1 ? Object.values(rows[1]) : [];
  const effectiveHeaders = (headers ?? []).map((header, colIndex) => {
    const base = sanitizeTextCell(header);
    const firstRowText = sanitizeTextCell(firstRowValues[colIndex]);
    const secondRowText = sanitizeTextCell(secondRowValues[colIndex]);
    const candidate = firstRowText || secondRowText;
    if (!base || !candidate || candidate === base) return base;
    if (/^col_\d+$/i.test(base) && /^(unit[aá]rio|parcial|total|qt\.?|qtd|quantidade|un|unid\.?|unidade)$/i.test(candidate)) {
      return candidate;
    }
    if (/(pre[cç]os?|valor)/i.test(base) && /(unit[aá]rio|parcial|total)/i.test(candidate)) {
      return `${base} ${candidate}`;
    }
    return base;
  });

  const normalizedEffectiveHeaders = effectiveHeaders.map((h) => normalizeText(h));
  const headerIndex = {
    code: normalizedEffectiveHeaders.findIndex((h) => /(codigo|cod|item|artigo|ref|art\.?º|cod\.)/.test(h)),
    description: normalizedEffectiveHeaders.findIndex((h) => /(descricao|designacao|trabalho|designa|item|tarefa)/.test(h)),
    unit: normalizedEffectiveHeaders.findIndex((h) => /^(un|unidade|uni|unid)$/.test(h) || /unidade|unid/.test(h)),
    quantity: normalizedEffectiveHeaders.findIndex((h) => /(^qt$|^qt\b|quantidade|quant|qtd)/.test(h)),
    unitPrice: normalizedEffectiveHeaders.findIndex((h) => /(preco unit|preco\/ unitario|unitario|p unit|valor unit|precos unit|precos unitario)/.test(h)),
    partial: normalizedEffectiveHeaders.findIndex((h) => /(parcial|precos parcial|valor parcial|importe)/.test(h)),
    total: normalizedEffectiveHeaders.findIndex((h) => /(^|\s)(total|valor total)(\s|$)/.test(h)),
  };

  const chapters: OrganizedBudgetResult["capitulos"] = [];
  let currentChapter: OrganizedBudgetResult["capitulos"][number] | null = null;
  let nextChapterNumber = 1;
  let articleCounter = 1;
  let includedRows = 0;
  let ignoredRows = 0;
  let subtotalRows = 0;
  let refRows = 0;
  const ignoredReasons = new Set<string>();

  const getCell = (values: unknown[], idx: number) => (idx >= 0 && idx < values.length ? values[idx] : null);
  const createChapter = (title: string) => {
    const chapter = { numero: nextChapterNumber++, titulo: title, artigos: [] as OrganizedBudgetResult["capitulos"][number]["artigos"] };
    chapters.push(chapter);
    currentChapter = chapter;
    return chapter;
  };

  const numericIgnoreIndices = [headerIndex.code, headerIndex.description, headerIndex.unit].filter((idx) => idx >= 0);

  for (const row of normalizedRows) {
    const values = Object.values(row);
    const textValues = values.map((value) => sanitizeTextCell(value)).filter(Boolean);

    if (!textValues.length) {
      ignoredRows += 1;
      ignoredReasons.add("linha vazia");
      continue;
    }

    if (isProbablyHeaderRow(values)) {
      ignoredRows += 1;
      ignoredReasons.add("cabeçalho do Excel");
      continue;
    }

    if (values.some((value) => isReferenceErrorText(value))) {
      refRows += 1;
      ignoredRows += 1;
      ignoredReasons.add("linha com fórmula quebrada (#REF!)");
      continue;
    }

    const numericEntries = extractRowNumbers(values, numericIgnoreIndices);
    const codeCandidate = [getCell(values, headerIndex.code), ...values].find((value) => looksLikeCode(value));
    const descriptionCandidate = [getCell(values, headerIndex.description), ...values].find((value) => {
      const text = sanitizeTextCell(value);
      return isMeaningfulDescription(text) && !looksLikeCode(text) && !isNumericLike(text);
    });
    const description = sanitizeTextCell(descriptionCandidate);

    const unitCandidate = headerIndex.unit >= 0 ? getCell(values, headerIndex.unit) : values.find((value) => VALID_UNITS.has(normalizeUnit(value, "")));
    const normalizedUnit = normalizeUnit(unitCandidate, "");
    const hasValidUnit = VALID_UNITS.has(normalizedUnit);

    const quantityValue = headerIndex.quantity >= 0 ? toNumber(getCell(values, headerIndex.quantity), Number.NaN) : Number.NaN;
    const unitPriceValue = headerIndex.unitPrice >= 0 ? toNumber(getCell(values, headerIndex.unitPrice), Number.NaN) : Number.NaN;
    const partialValue = headerIndex.partial >= 0 ? toNumber(getCell(values, headerIndex.partial), Number.NaN) : Number.NaN;
    const totalColumnValue = headerIndex.total >= 0 ? toNumber(getCell(values, headerIndex.total), Number.NaN) : Number.NaN;

    const fallbackNumeric = [...numericEntries];
    const likelyQty = Number.isFinite(quantityValue)
      ? quantityValue
      : fallbackNumeric.length >= 3
        ? fallbackNumeric[Math.max(0, fallbackNumeric.length - 3)].value
        : fallbackNumeric.length >= 2
          ? fallbackNumeric[0].value
          : Number.NaN;
    const likelyUnitPrice = Number.isFinite(unitPriceValue)
      ? unitPriceValue
      : fallbackNumeric.length >= 2
        ? fallbackNumeric[Math.max(0, fallbackNumeric.length - 2)].value
        : Number.NaN;
    let likelyPartial = Number.isFinite(partialValue)
      ? partialValue
      : fallbackNumeric.length >= 1
        ? fallbackNumeric[fallbackNumeric.length - 1].value
        : Number.NaN;

    if (Number.isFinite(totalColumnValue) && almostEqual(likelyQty * likelyUnitPrice, totalColumnValue, 0.03)) {
      likelyPartial = Number.isFinite(partialValue) ? partialValue : totalColumnValue;
    }

    const hasDescription = !!description;
    const hasCode = !!sanitizeTextCell(codeCandidate);
    const quantityIsNumeric = Number.isFinite(likelyQty);
    const unitPriceIsNumeric = Number.isFinite(likelyUnitPrice);
    const partialIsNumeric = Number.isFinite(likelyPartial);
    const totalIsNumeric = Number.isFinite(totalColumnValue);
    const containsIncludedText = values.some((value) => isIncludedText(value));
    const textJoined = normalizeText(textValues.join(" "));
    const isSummaryLike = SUMMARY_KEYWORDS.test(textJoined);

    const isChapterOrSubtotal = hasCode && hasDescription && !hasValidUnit && !quantityIsNumeric && !unitPriceIsNumeric && totalIsNumeric;
    const isChapterTextOnly = hasDescription && !hasValidUnit && !quantityIsNumeric && !unitPriceIsNumeric && !partialIsNumeric && (looksLikeCode(codeCandidate) || isChapterLabel(description));

    if (containsIncludedText) {
      includedRows += 1;
      ignoredRows += 1;
      ignoredReasons.add('linha "incluído no artigo"');
      continue;
    }

    if (isChapterOrSubtotal || isChapterTextOnly) {
      subtotalRows += 1;
      createChapter(description || sanitizeTextCell(codeCandidate) || `Capítulo ${nextChapterNumber}`);
      continue;
    }

    if (isSummaryLike) {
      subtotalRows += 1;
      ignoredRows += 1;
      ignoredReasons.add("subtotal ou total agregado");
      continue;
    }

    const matchesMath = quantityIsNumeric && unitPriceIsNumeric && partialIsNumeric && almostEqual(likelyQty * likelyUnitPrice, likelyPartial, 0.03);
    const isBudgetItem = hasDescription && hasValidUnit && quantityIsNumeric && unitPriceIsNumeric && partialIsNumeric && matchesMath;

    if (!isBudgetItem) {
      ignoredRows += 1;
      if (!hasDescription) ignoredReasons.add("linha sem descrição válida");
      else if (!hasValidUnit) ignoredReasons.add("linha sem unidade válida");
      else if (!partialIsNumeric) ignoredReasons.add("linha sem preço parcial válido");
      else if (!matchesMath) ignoredReasons.add("parcial incompatível com quantidade × preço unitário");
      else ignoredReasons.add("linha informativa ou nota");
      continue;
    }

    if (!currentChapter) {
      createChapter("Geral");
    }

    const matched = findCatalogMatch({ codigo: String(codeCandidate ?? ""), descricao: description }, catalog);
    const finalUnitPrice = likelyUnitPrice > 0 ? likelyUnitPrice : Number(matched?.preco_unitario || 0);
    if (!(finalUnitPrice > 0)) {
      ignoredRows += 1;
      ignoredReasons.add("artigo sem preço unitário válido");
      continue;
    }

    currentChapter?.artigos.push({
      codigo: normalizeCode(codeCandidate, `${currentChapter?.numero}.${articleCounter++}`),
      descricao: description,
      unidade: normalizeUnit(unitCandidate || matched?.unidade || "un"),
      quantidade: likelyQty,
      preco_unitario: finalUnitPrice,
    });
  }

  const filteredChapters = chapters.filter((chapter) => chapter.artigos.length > 0);
  if (!filteredChapters.length) return null;

  const importedTotal = calculateBudgetTotal({ capitulos: filteredChapters });
  const originalTotal = detectFinalBudgetTotal(rows, headers ?? []);
  const difference = Math.abs(originalTotal - importedTotal);

  return {
    titulo_sugerido: String(fileName || "Orçamento Importado").replace(/\.[^.]+$/, "") || "Orçamento Importado",
    capitulos: filteredChapters,
    _meta: {
      original_total: originalTotal,
      imported_total: importedTotal,
      difference,
      status: originalTotal > 0 && difference > 0.5 ? "review_required" : "ok",
      valid_articles: filteredChapters.reduce((sum, chapter) => sum + chapter.artigos.length, 0),
      chapters_found: chapters.length,
      ignored_rows: ignoredRows,
      included_rows: includedRows,
      subtotal_rows: subtotalRows,
      ref_rows: refRows,
      ignored_reasons: Array.from(ignoredReasons),
    },
  };
};

const calculateBudgetTotal = (budget: { capitulos?: Array<{ artigos?: Array<{ quantidade?: number; preco_unitario?: number }> }> }) =>
  (budget.capitulos ?? []).reduce(
    (sum, chapter) => sum + (chapter.artigos ?? []).reduce(
      (chapterSum, article) => chapterSum + toNumber(article.quantidade, 0) * toNumber(article.preco_unitario, 0),
      0,
    ),
    0,
  );

const extractExpectedTotalFromRows = (rows: Array<Record<string, unknown>>, headers: string[] = []) => detectFinalBudgetTotal(rows, headers);

const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "organize_budget",
    description: "Organiza dados brutos num orçamento estruturado com capítulos e artigos",
    parameters: {
      type: "object",
      properties: {
        titulo_sugerido: { type: "string", description: "Título sugerido para o orçamento" },
        capitulos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              numero: { type: "number" },
              titulo: { type: "string" },
              artigos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    codigo: { type: "string", description: "Código do artigo (ex: 1.1)" },
                    descricao: { type: "string" },
                    unidade: { type: "string", description: "Unidade normalizada: un, m, m2, m3, ml, kg, vg, l" },
                    quantidade: { type: "number" },
                    preco_unitario: { type: "number" },
                  },
                  required: ["descricao", "unidade", "quantidade", "preco_unitario"],
                  additionalProperties: false,
                },
              },
            },
            required: ["numero", "titulo", "artigos"],
            additionalProperties: false,
          },
        },
      },
      required: ["titulo_sugerido", "capitulos"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `Você é um especialista em orçamentos de construção civil portuguesa. Recebe dados extraídos de um ficheiro (Excel, PDF ou DOCX) de orçamento e deve organizá-los no formato padrão do ObraSys.

REGRAS CRÍTICAS:
1. PRESERVE EXATAMENTE os valores numéricos originais (quantidade e preço unitário). NUNCA invente, multiplique ou estime valores. Os valores recebidos já vêm como números - copie-os tal como estão, sem multiplicar por 1000 nem adicionar dígitos.
2. Formato numérico português no ficheiro original: ponto = separador de milhares, vírgula = decimal ("1.234,56" = 1234.56). Os dados já chegam normalizados; respeite-os.
3. Identifique CAPÍTULOS (títulos de secção, normalmente em maiúsculas, numerados como "1", "CAP. I", sem quantidade/preço) e ARTIGOS (descrição + quantidade + preço).
4. PRESERVE TODOS OS CAPÍTULOS originais. NÃO agrupe tudo num único "Geral" nem "CONSTRUÇÃO CIVIL". Se o ficheiro tem 8 capítulos, devolva 8 capítulos.
5. Normalize as unidades para: un, m, m2, m3, ml, kg, vg, l
6. Se o código do artigo não existir, gere um código sequencial (ex: 1.1, 1.2, 2.1).
7. Sugira um título para o orçamento baseado no conteúdo.
8. Se o preço unitário vier vazio, nulo, 0 ou inválido, procure na BASE DE PREÇOS por código ou descrição semelhante e preencha o valor encontrado. Não invente preços fora dessa base.
9. IGNORE linhas de subtotal, total, IVA, "TOTAL CAPÍTULO", "TOTAL GERAL" - não as inclua como artigos.

IMPORTANTE: A soma (quantidade × preço) dos artigos importados deve aproximar-se do total do orçamento original. Se a soma ficar 100× ou 1000× acima do total, está a corromper os valores - reveja antes de devolver.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  let logUserId: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logUserId = user.id;

    const body = await req.json();
    const { rows, headers, rawText, pdfBase64, fileName } = body;

    // Determine input mode
    const hasPdf = !!pdfBase64;
    const hasRawText = !!rawText;
    const hasTabular = Array.isArray(rows) && rows.length > 0;

    if (!hasPdf && !hasRawText && !hasTabular) {
      return new Response(JSON.stringify({ error: "Nenhum dado recebido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (hasTabular && rows.length > 5000) {
      return new Response(JSON.stringify({ error: "Limite de 5000 linhas excedido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave IA não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch price catalog
    const { data: userPriceRows } = await client
      .from("artigos_trabalho")
      .select("codigo, descricao, unidade, preco_unitario")
      .eq("ativo", true)
      .limit(1000);

    const { data: defaultPriceRows } = await client
      .from("default_articles")
      .select("codigo, descricao, unidade, preco_unitario")
      .limit(1000);

    const priceCatalog = [...(userPriceRows ?? []), ...(defaultPriceRows ?? [])]
      .filter((item) => Number(item?.preco_unitario) > 0)
      .slice(0, 400);

    const compactPriceCatalog = priceCatalog.map((item) => ({
      codigo: item.codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      preco_unitario: Number(item.preco_unitario),
    }));

    // Keep prompt small to stay under the 150s edge function timeout
    const priceSample = compactPriceCatalog.slice(0, 150);
    const priceContext = `\n\nBASE DE PREÇOS (amostra ${priceSample.length} de ${compactPriceCatalog.length}):\n${JSON.stringify(priceSample, null, 0)}`;

    const deterministicBudget = hasTabular
      ? deriveBudgetFromRows(rows, headers, compactPriceCatalog, fileName)
      : null;

    if (deterministicBudget) {
      await logAxiaCall(adminClient, {
        module: "organize_budget_import", task_type: "deterministic",
        provider_used: "none", model_used: "deterministic",
        status: "ok", latency_ms: Date.now() - t0, user_id: logUserId,
      });
      return new Response(JSON.stringify(deterministicBudget), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    let userMessages: Array<{ type: string; [key: string]: unknown }>;

    if (hasPdf) {
      userMessages = [
        { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
        { type: "text", text: `Analise este PDF de orçamento de construção e extraia todos os capítulos e artigos.\n\nFicheiro: ${fileName || "orcamento.pdf"}${priceContext}\n\nOrganize no formato JSON estruturado do ObraSys.` },
      ];
    } else if (hasRawText) {
      const truncatedText = rawText.slice(0, 12000);
      userMessages = [
        { type: "text", text: `Texto extraído de um documento DOCX de orçamento de construção:\n\n${truncatedText}${rawText.length > 12000 ? "\n\n... (texto truncado)" : ""}${priceContext}\n\nOrganize no formato JSON estruturado do ObraSys.` },
      ];
    } else {
      const MAX_ROWS_AI = 250;
      const sampleRows = rows.slice(0, MAX_ROWS_AI);
      userMessages = [
        { type: "text", text: `Ficheiro: ${fileName || "orcamento"}\nColunas: ${JSON.stringify(headers)}\n\nDados brutos (${rows.length} linhas totais, a mostrar ${sampleRows.length}):\n${JSON.stringify(sampleRows, null, 0)}${rows.length > MAX_ROWS_AI ? `\n\n... e mais ${rows.length - MAX_ROWS_AI} linhas (truncadas para evitar timeout).` : ""}${priceContext}\n\nOrganize estes dados no formato JSON estruturado do ObraSys.` },
      ];
    }

    // Abort before the 150s edge function idle timeout
    const aiAbort = new AbortController();
    const aiTimer = setTimeout(() => aiAbort.abort(), 130_000);

    let aiResponse: Response;
    try {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: resolveChain("budget_import").primary,
          messages: [
            { role: "system", content: SYSTEM_PROMPT + "\n\n" + AXIA_ANTI_HALLUCINATION_BLOCK },
            { role: "user", content: userMessages },
          ],
          tools: [TOOL_SCHEMA],
          tool_choice: { type: "function", function: { name: "organize_budget" } },
        }),
        signal: aiAbort.signal,
      });
    } catch (err) {
      clearTimeout(aiTimer);
      const isAbort = (err as Error)?.name === "AbortError";
      return new Response(
        JSON.stringify({
          error: isAbort
            ? "A IA demorou demasiado a processar o ficheiro. Tente um ficheiro mais pequeno (menos linhas ou páginas)."
            : "Falha ao contactar a IA. Tente novamente.",
        }),
        { status: isAbort ? 504 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    clearTimeout(aiTimer);

    if (!aiResponse.ok) {
      await logAxiaCall(adminClient, {
        module: "organize_budget_import",
        task_type: hasPdf ? "pdf" : hasRawText ? "text" : "tabular",
        provider_used: "lovable", model_used: resolveChain("budget_import").primary,
        status: aiResponse.status === 429 ? "rate_limited" : "error",
        latency_ms: Date.now() - t0, user_id: logUserId,
        error_message: `gateway ${aiResponse.status}`,
      });
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente em breves momentos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao processar com IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "IA não retornou dados estruturados" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const organized = JSON.parse(toolCall.function.arguments);

    const normalized: OrganizedBudgetResult = {
      titulo_sugerido: String(organized?.titulo_sugerido || "Orçamento Importado"),
      capitulos: Array.isArray(organized?.capitulos)
        ? organized.capitulos.map((cap: any, index: number) => ({
            numero: Math.round(toNumber(cap?.numero, index + 1)),
            titulo: String(cap?.titulo || `Capítulo ${index + 1}`),
            artigos: Array.isArray(cap?.artigos)
              ? cap.artigos
                  .map((art: any, artIndex: number) => {
                    const descricao = String(art?.descricao || "").trim();
                    if (!descricao) return null;
                    const matched = findCatalogMatch(art, compactPriceCatalog);
                    const precoOriginal = toNumber(art?.preco_unitario, 0);
                    const precoFinal = precoOriginal > 0 ? precoOriginal : Number(matched?.preco_unitario || 0);
                    return {
                      codigo: String(art?.codigo || `${index + 1}.${artIndex + 1}`),
                      descricao,
                      unidade: normalizeUnit(art?.unidade || matched?.unidade || "un"),
                      quantidade: toNumber(art?.quantidade, 1),
                      preco_unitario: precoFinal,
                    };
                  })
                  .filter(Boolean)
              : [],
          }))
        : [],
      _meta: {
        original_total: hasTabular ? extractExpectedTotalFromRows(rows, headers ?? []) : 0,
        imported_total: 0,
        difference: 0,
        status: "ok",
        valid_articles: 0,
        chapters_found: 0,
        ignored_rows: 0,
        included_rows: 0,
        subtotal_rows: 0,
        ref_rows: 0,
        ignored_reasons: [],
      },
    };

    normalized._meta.imported_total = calculateBudgetTotal(normalized);
    normalized._meta.difference = Math.abs(normalized._meta.original_total - normalized._meta.imported_total);
    normalized._meta.valid_articles = normalized.capitulos.reduce((sum, cap) => sum + cap.artigos.length, 0);
    normalized._meta.chapters_found = normalized.capitulos.length;
    normalized._meta.status = normalized._meta.original_total > 0 && normalized._meta.difference > 0.5
      ? "review_required"
      : "ok";

    if (hasTabular) {
      const expectedTotal = normalized._meta.original_total;
      const aiTotal = normalized._meta.imported_total;
      const ratio = expectedTotal > 0 && aiTotal > 0 ? Math.max(expectedTotal, aiTotal) / Math.min(expectedTotal, aiTotal) : 1;

      if (expectedTotal > 0 && ratio > 1.5) {
        const fallbackBudget = deriveBudgetFromRows(rows, headers, compactPriceCatalog, fileName);
        if (fallbackBudget) {
          return new Response(JSON.stringify(fallbackBudget), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          error: "A importação gerou valores incoerentes face ao Excel original. Tente novamente ou reveja o ficheiro antes de gravar.",
          validation: {
            original_total: expectedTotal,
            imported_total: aiTotal,
            difference: Math.abs(expectedTotal - aiTotal),
            status: "review_required",
          },
        }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify(normalized), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("organize-budget-import error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
