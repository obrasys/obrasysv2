import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

const normalizeUnit = (value: unknown) => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "un";
  if (["un", "uni", "unid", "unidade", "unidades"].includes(raw)) return "un";
  if (["m", "metro", "metros"].includes(raw)) return "m";
  if (["m2", "m²", "mq"].includes(raw)) return "m2";
  if (["m3", "m³"].includes(raw)) return "m3";
  if (["ml", "m.l.", "metro linear", "metros lineares"].includes(raw)) return "ml";
  if (["kg", "quilo", "quilos"].includes(raw)) return "kg";
  if (["l", "lt", "litro", "litros"].includes(raw)) return "l";
  if (["vg", "verba"].includes(raw)) return "vg";
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

REGRAS:
1. Identifique quais linhas são CAPÍTULOS (títulos de secção, sem quantidade nem preço) e quais são ARTIGOS (itens de trabalho com descrição, quantidade, preço).
2. Agrupe os artigos sob o capítulo correto. Se não houver capítulo explícito, crie um capítulo "Geral".
3. Normalize as unidades para: un, m, m2, m3, ml, kg, vg, l
4. Se uma linha tiver apenas texto (sem valores numéricos relevantes), é provavelmente um capítulo.
5. Se o código do artigo não existir, gere um código sequencial (ex: 1.1, 1.2, 2.1).
6. Sugira um título para o orçamento baseado no conteúdo.
7. Se o preço unitário vier vazio, nulo, 0 ou inválido, procure na BASE DE PREÇOS por código ou descrição semelhante e preencha o valor encontrado.
8. Se existirem subtotais ou totais, IGNORE essas linhas.

IMPORTANTE: Não invente dados. Se um campo não existir nos dados originais, use null.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    if (hasTabular && rows.length > 500) {
      return new Response(JSON.stringify({ error: "Limite de 500 linhas excedido" }), {
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
      .slice(0, 1200);

    const compactPriceCatalog = priceCatalog.map((item) => ({
      codigo: item.codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      preco_unitario: Number(item.preco_unitario),
    }));

    // Build AI messages based on input type
    const priceContext = `\n\nBASE DE PREÇOS (${compactPriceCatalog.length} itens):\n${JSON.stringify(compactPriceCatalog.slice(0, 400), null, 0)}`;

    let userMessages: Array<{ type: string; [key: string]: unknown }>;

    if (hasPdf) {
      // Multimodal: send PDF as file content to Gemini
      userMessages = [
        {
          type: "image_url",
          image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
        },
        {
          type: "text",
          text: `Analise este PDF de orçamento de construção e extraia todos os capítulos e artigos.\n\nFicheiro: ${fileName || "orcamento.pdf"}${priceContext}\n\nOrganize no formato JSON estruturado do ObraSys.`,
        },
      ];
    } else if (hasRawText) {
      const truncatedText = rawText.slice(0, 15000);
      userMessages = [
        {
          type: "text",
          text: `Texto extraído de um documento DOCX de orçamento de construção:\n\n${truncatedText}${rawText.length > 15000 ? "\n\n... (texto truncado)" : ""}${priceContext}\n\nOrganize no formato JSON estruturado do ObraSys.`,
        },
      ];
    } else {
      userMessages = [
        {
          type: "text",
          text: `Colunas do Excel: ${JSON.stringify(headers)}\n\nDados brutos (${rows.length} linhas):\n${JSON.stringify(rows.slice(0, 200), null, 0)}${rows.length > 200 ? `\n\n... e mais ${rows.length - 200} linhas adicionais.` : ""}${priceContext}\n\nOrganize estes dados no formato JSON estruturado do ObraSys.`,
        },
      ];
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessages },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "organize_budget" } },
      }),
    });

    if (!aiResponse.ok) {
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

    const normalized = {
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
    };

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
