import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface SecaoAnalise {
  codigo: string;
  nome: string;
  nivel: number;
  parent_codigo?: string;
  itens: ItemAnalise[];
}

interface ItemAnalise {
  descricao: string;
  unidade: string | null;
  quantidade: number | null;
  texto_original: string;
  classificacao: {
    tipo_trabalho?: string;
    metodo_construtivo?: string;
    material_principal?: string;
  };
}

const MAX_CHARS_PER_CHUNK = 35000; // chunks menores para reduzir timeout e melhorar consistência
const AI_REQUEST_TIMEOUT_MS = 30000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { caderno_id, ficheiro_url, ficheiro_tipo, conteudo_texto } = await req.json();

    if (!caderno_id) {
      return new Response(
        JSON.stringify({ error: "caderno_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Token validation error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);

    const { data: cadernoCheck, error: cadernoCheckError } = await supabaseClient
      .from("cadernos_encargos")
      .select("id, user_id")
      .eq("id", caderno_id)
      .single();

    if (cadernoCheckError || !cadernoCheck) {
      console.error("Caderno not found or access denied:", cadernoCheckError);
      return new Response(
        JSON.stringify({ error: "Caderno não encontrado ou acesso negado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar status para "a_analisar"
    await supabaseClient
      .from("cadernos_encargos")
      .update({ status: "a_analisar" })
      .eq("id", caderno_id);

    let textoParaAnalise = conteudo_texto || "";

    // Se for BC3/XML, fazer parsing direto
    if (ficheiro_tipo === "application/xml" || ficheiro_tipo === "text/xml") {
      const resultadoBC3 = await parseBC3(textoParaAnalise);
      if (resultadoBC3) {
        await salvarResultado(supabaseClient, caderno_id, resultadoBC3);
        return new Response(
          JSON.stringify({ success: true, resultado: resultadoBC3 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if text is empty or too short
    if (!textoParaAnalise || textoParaAnalise.length < 20) {
      return new Response(
        JSON.stringify({ error: "Conteúdo do ficheiro vazio ou insuficiente para análise." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const textLength = textoParaAnalise.length;
    console.log(`Texto para análise: ${textLength} caracteres`);

    let allSecoes: SecaoAnalise[] = [];

    try {
      if (textLength <= MAX_CHARS_PER_CHUNK) {
        const resultado = await analyzeChunk(textoParaAnalise, LOVABLE_API_KEY, 1, 1);
        allSecoes = resultado.secoes;
      } else {
        // Split text into chunks, trying to split at section boundaries
        const chunks = splitTextIntoChunks(textoParaAnalise, MAX_CHARS_PER_CHUNK);
        console.log(`Documento grande: dividido em ${chunks.length} partes`);

        const chunkResults = await Promise.all(
          chunks.map(async (chunk, i) => {
            console.log(`A analisar parte ${i + 1}/${chunks.length} (${chunk.length} chars)`);
            try {
              return await analyzeChunk(chunk, LOVABLE_API_KEY, i + 1, chunks.length);
            } catch (err) {
              console.error(`Erro na parte ${i + 1}:`, err);
              const fallback = parseStructuredTabularText(chunk);
              if (fallback?.secoes?.length) {
                console.warn(`Parte ${i + 1}: fallback tabular ativado (${fallback.secoes.length} secções)`);
                return fallback;
              }
              return { secoes: [] };
            }
          })
        );

        for (const chunkResult of chunkResults) {
          if (!chunkResult) continue;

          // Merge sections: if same section code exists, merge items
          for (const secao of chunkResult.secoes) {
            const existing = allSecoes.find(s => s.codigo === secao.codigo && s.nome === secao.nome);
            if (existing) {
              existing.itens.push(...secao.itens);
            } else {
              allSecoes.push(secao);
            }
          }
        }
      }
    } catch (aiError) {
      console.error("Falha na análise por IA, a tentar fallback tabular:", aiError);
    }

    if (allSecoes.length === 0) {
      const fallback = parseStructuredTabularText(textoParaAnalise);
      if (fallback) {
        allSecoes = fallback.secoes;
        console.log(`Fallback tabular ativado: ${allSecoes.length} secções`);
      }
    }

    if (allSecoes.length === 0) {
      await supabaseClient
        .from("cadernos_encargos")
        .update({ status: "importado" })
        .eq("id", caderno_id);

      return new Response(
        JSON.stringify({ error: "Não foi possível extrair itens do documento. Verifique se o formato é suportado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resultado = { secoes: allSecoes };
    await salvarResultado(supabaseClient, caderno_id, resultado);

    const totalItens = allSecoes.reduce((sum, s) => sum + s.itens.length, 0);
    console.log(`Análise concluída: ${allSecoes.length} secções, ${totalItens} itens`);

    return new Response(
      JSON.stringify({ success: true, resultado }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na análise do caderno:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function splitTextIntoChunks(text: string, maxChars: number): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let currentChunk = "";

  // Try to split at section boundaries (lines starting with major section markers)
  const isSectionBoundary = (line: string): boolean => {
    // Match patterns like "||A|1|", "||A|12|", section headers
    return /^\[\d+\]\s*\|*\s*\|*\s*A\s*\|\s*\d+\s*\|/.test(line) ||
           /^\[\d+\]\s*.*\|(ESTALEIRO|PREPARAÇÕES|TETOS|PAREDES|ACABAMENTOS|PAVIMENTOS|CANTARIAS|CARPINTARIAS|SERRALHARIAS|ILUMINAÇÃO|REDE DE|SEGURANÇA|DETEÇÃO|ITED|AVAC|DIVERSOS|IMAGEM|SPRINKLERS|RIA)/i.test(line);
  };

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxChars && currentChunk.length > 0) {
      // Try to find a section boundary nearby to split
      chunks.push(currentChunk);
      currentChunk = "";
    }
    currentChunk += (currentChunk ? "\n" : "") + line;
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }
  return chunks;
}

async function analyzeChunk(
  text: string,
  apiKey: string,
  chunkIndex: number,
  totalChunks: number
): Promise<{ secoes: SecaoAnalise[] }> {
  const chunkContext = totalChunks > 1
    ? `\n\nNOTA IMPORTANTE: Este é o bloco ${chunkIndex} de ${totalChunks} do documento completo. Extrai TODOS os itens deste bloco sem exceção.`
    : "";

  const systemPrompt = `És um especialista em cadernos de encargos e mapas de quantidades de construção civil para Portugal e Espanha.

A tua tarefa é analisar o texto de um mapa de quantidades / caderno de encargos e extrair TODA a informação estruturada. É ABSOLUTAMENTE CRÍTICO que extraias TODOS os itens sem exceção.

O DOCUMENTO TEM ESTA ESTRUTURA TÍPICA:
- Colunas: SPU | Especialidade | Item | Designação | Unidade | Quantidade | Preço Unitário | Valor
- Secções principais são identificadas por números (1, 2, 3...) e nomes em MAIÚSCULAS
- Sub-itens dentro de cada secção têm numeração hierárquica (1.1, 1.2, 2.1, etc.)
- Linhas com dados podem ter formato: [nº linha] valor1 | valor2 | valor3 ...

REGRAS CRÍTICAS:
1. NUNCA inventes quantidades - se não encontrares, deixa null
2. Extrai ABSOLUTAMENTE TODOS os itens de trabalho - NÃO OMITAS NENHUM
3. Linhas com "0.00 €" ou completamente vazias NÃO são itens
4. Notas explicativas longas sem unidade/quantidade NÃO são itens de trabalho
5. Para cada item: descricao, unidade, quantidade, texto_original e classificacao`;

  const userPrompt = `Analisa o seguinte mapa de quantidades / caderno de encargos e extrai a estrutura completa com ABSOLUTAMENTE TODOS os itens de trabalho.${chunkContext}

${text}`;

  const tools = [
    {
      type: "function",
      function: {
        name: "extract_caderno_structure",
        description: "Extrair estrutura completa do caderno de encargos com TODOS os itens sem exceção",
        parameters: {
          type: "object",
          properties: {
            secoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  codigo: { type: "string", description: "Código da secção (ex: 1, 1.1, 2, A.12)" },
                  nome: { type: "string", description: "Nome da secção" },
                  nivel: { type: "integer", description: "Nível hierárquico (1, 2, 3...)" },
                  parent_codigo: { type: "string", description: "Código da secção pai" },
                  itens: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        descricao: { type: "string" },
                        unidade: { type: "string", nullable: true },
                        quantidade: { type: "number", nullable: true },
                        texto_original: { type: "string" },
                        classificacao: {
                          type: "object",
                          properties: {
                            tipo_trabalho: { type: "string" },
                            metodo_construtivo: { type: "string" },
                            material_principal: { type: "string" },
                          },
                        },
                      },
                      required: ["descricao", "texto_original"],
                    },
                  },
                },
                required: ["codigo", "nome", "nivel", "itens"],
              },
            },
          },
          required: ["secoes"],
        },
      },
    },
  ];

  const primaryResponse = await callLovableAi(apiKey, {
    model: "google/gemini-2.5-flash",
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tools,
    tool_choice: { type: "function", function: { name: "extract_caderno_structure" } },
  });

  let parsed = extractStructuredResult(primaryResponse);
  if (parsed) {
    const totalItems = parsed.secoes.reduce((s, sec) => s + sec.itens.length, 0);
    console.log(`Chunk ${chunkIndex}: extracted ${parsed.secoes.length} sections, ${totalItems} items`);
    return parsed;
  }

  console.warn(`Chunk ${chunkIndex}: resposta sem estrutura válida no 1º pedido, a tentar fallback JSON...`);

  // Em documentos grandes, evitar 2ª chamada à IA por chunk para não ultrapassar timeout da função.
  if (totalChunks > 1) {
    throw new Error(`Resposta sem estrutura válida para o bloco ${chunkIndex}`);
  }

  const retryResponse = await callLovableAi(apiKey, {
    model: "google/gemini-2.5-flash",
    temperature: 0,
    messages: [
      { role: "system", content: `${systemPrompt}\n\nResponde APENAS com JSON válido neste formato: {"secoes":[...]} sem markdown.` },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  parsed = extractStructuredResult(retryResponse);
  if (parsed) {
    const totalItems = parsed.secoes.reduce((s, sec) => s + sec.itens.length, 0);
    console.log(`Chunk ${chunkIndex} (fallback): extracted ${parsed.secoes.length} sections, ${totalItems} items`);
    return parsed;
  }

  const finishReason = retryResponse?.choices?.[0]?.finish_reason || primaryResponse?.choices?.[0]?.finish_reason || "unknown";
  throw new Error(`Não foi possível extrair estrutura da resposta da IA (finish_reason=${finishReason})`);
}

async function callLovableAi(apiKey: string, payload: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Timeout ao contactar a IA");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Gateway error:", response.status, errorText);

    if (response.status === 429) {
      throw new Error("Limite de pedidos excedido. Tente novamente mais tarde.");
    }
    if (response.status === 402) {
      throw new Error("Créditos insuficientes. Adicione créditos ao workspace.");
    }

    throw new Error(`AI Gateway error: ${response.status}`);
  }

  return response.json();
}

function extractStructuredResult(aiResponse: any): { secoes: SecaoAnalise[] } | null {
  const message = aiResponse?.choices?.[0]?.message;
  const candidates: unknown[] = [];

  if (Array.isArray(message?.tool_calls)) {
    for (const toolCall of message.tool_calls) {
      if (toolCall?.function?.arguments) {
        candidates.push(toolCall.function.arguments);
      }
    }
  }

  if (typeof message?.content === "string" && message.content.trim()) {
    candidates.push(message.content);
  }

  if (Array.isArray(message?.content)) {
    const textParts = message.content
      .filter((part: any) => part?.type === "text" && typeof part?.text === "string")
      .map((part: any) => part.text)
      .join("\n");
    if (textParts.trim()) {
      candidates.push(textParts);
    }
  }

  for (const candidate of candidates) {
    const parsed = tryParseJsonFlexible(candidate);
    const normalized = normalizeAiResult(parsed);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function tryParseJsonFlexible(input: unknown): any | null {
  if (!input) return null;
  if (typeof input === "object") return input;
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const sanitized = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const attempts = [sanitized, cleanupJsonString(sanitized)];

  const extracted = extractFirstJsonObject(sanitized);
  if (extracted) {
    attempts.push(extracted, cleanupJsonString(extracted));
  }

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      // try next
    }
  }

  return null;
}

function cleanupJsonString(value: string): string {
  return value
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function normalizeAiResult(parsed: any): { secoes: SecaoAnalise[] } | null {
  if (!parsed) return null;

  let rawSecoes = parsed.secoes;
  if (!Array.isArray(rawSecoes)) {
    if (Array.isArray(parsed.sections)) {
      rawSecoes = parsed.sections;
    } else if (Array.isArray(parsed.capitulos)) {
      rawSecoes = parsed.capitulos;
    } else if (Array.isArray(parsed.itens)) {
      rawSecoes = [{ codigo: "1", nome: "Geral", nivel: 1, itens: parsed.itens }];
    } else {
      return null;
    }
  }

  const secoes: SecaoAnalise[] = rawSecoes
    .map((secao: any, index: number) => {
      const rawItens = Array.isArray(secao?.itens) ? secao.itens : [];
      const itens: ItemAnalise[] = rawItens
        .map((item: any) => {
          const descricao = String(item?.descricao || item?.texto_original || "").trim();
          if (!descricao) return null;

          const unidade = item?.unidade == null ? null : String(item.unidade).trim() || null;
          const quantidade = parseQuantidade(item?.quantidade);
          const textoOriginal = String(item?.texto_original || descricao).trim();

          return {
            descricao,
            unidade,
            quantidade,
            texto_original: textoOriginal,
            classificacao: {
              tipo_trabalho: item?.classificacao?.tipo_trabalho,
              metodo_construtivo: item?.classificacao?.metodo_construtivo,
              material_principal: item?.classificacao?.material_principal,
            },
          };
        })
        .filter((item: ItemAnalise | null): item is ItemAnalise => item !== null);

      return {
        codigo: String(secao?.codigo || index + 1),
        nome: String(secao?.nome || `Secção ${index + 1}`),
        nivel: Number(secao?.nivel) > 0 ? Number(secao.nivel) : 1,
        parent_codigo: secao?.parent_codigo ? String(secao.parent_codigo) : undefined,
        itens,
      };
    })
    .filter((secao: SecaoAnalise) => secao.itens.length > 0);

  if (!secoes.length) return null;

  return { secoes };
}

function parseQuantidade(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/\s/g, "");
    if (!cleaned) return null;

    // 1.234,56 -> 1234.56
    const ptFormatted = cleaned.replace(/\./g, "").replace(/,/g, ".");
    const parsedPt = Number(ptFormatted);
    if (Number.isFinite(parsedPt)) return parsedPt;

    // 1,234.56 -> 1234.56
    const enFormatted = cleaned.replace(/,/g, "");
    const parsedEn = Number(enFormatted);
    if (Number.isFinite(parsedEn)) return parsedEn;

    const parsedSimple = Number(cleaned.replace(/,/g, "."));
    return Number.isFinite(parsedSimple) ? parsedSimple : null;
  }
  return null;
}

function parseStructuredTabularText(content: string): { secoes: SecaoAnalise[] } | null {
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.some((line) => line.startsWith("["))) return null;

  const headerLine = lines.find((line) => line.toLowerCase().startsWith("colunas:"));
  const headers = headerLine
    ? headerLine.replace(/^colunas:\s*/i, "").split("|").map((h) => h.trim().toLowerCase())
    : [];

  const findHeaderIndex = (patterns: RegExp[]) => {
    return headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
  };

  const secaoIdx = findHeaderIndex([/especialidade/, /sec[aã]o/, /cap[ií]tulo/, /^spu$/]);
  const descIdx = findHeaderIndex([/designa[cç][aã]o/, /descri[cç][aã]o/, /trabalho/, /^item$/, /artigo/]);
  const unitIdx = findHeaderIndex([/^un$/, /unidade/]);
  const qtyIdx = findHeaderIndex([/quantidade/, /^quant$/]);

  const secaoMap = new Map<string, SecaoAnalise>();

  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s*(.+)$/);
    if (!match) continue;

    const rawText = match[2];
    const cols = rawText.split("|").map((col) => col.trim());

    const pickByIndex = (index: number): string | null => {
      if (index < 0 || index >= cols.length) return null;
      const value = cols[index]?.trim();
      return value ? value : null;
    };

    const rawDescricao = pickByIndex(descIdx) ?? inferDescricao(cols);
    if (!rawDescricao || isNonItemLine(rawDescricao)) continue;

    const unidade = pickByIndex(unitIdx);
    const quantidade = parseQuantidade(pickByIndex(qtyIdx));

    const secaoNome = (pickByIndex(secaoIdx) || "Geral").slice(0, 80);
    const secaoCodigo = String(secaoMap.size + 1);

    if (!secaoMap.has(secaoNome)) {
      secaoMap.set(secaoNome, {
        codigo: secaoCodigo,
        nome: secaoNome,
        nivel: 1,
        itens: [],
      });
    }

    const secao = secaoMap.get(secaoNome)!;
    secao.itens.push({
      descricao: rawDescricao,
      unidade,
      quantidade,
      texto_original: rawText,
      classificacao: {},
    });
  }

  const secoes = Array.from(secaoMap.values()).filter((secao) => secao.itens.length > 0);
  if (secoes.length === 0) return null;

  return { secoes };
}

function inferDescricao(cols: string[]): string | null {
  const candidates = cols
    .map((value) => value.trim())
    .filter((value) => value && !/^\d+(?:[.,]\d+)?$/.test(value) && !/€$/.test(value));

  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.length - a.length)[0];
}

function isNonItemLine(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  if (!normalized) return true;
  if (normalized === "0.00" || normalized === "0.00 €") return true;
  return /^[-–-]+$/.test(normalized);
}

// Parser básico para BC3
async function parseBC3(xmlContent: string): Promise<{ secoes: SecaoAnalise[] } | null> {
  try {
    const secoes: SecaoAnalise[] = [];
    const lines = xmlContent.split("\n");
    
    let currentSecao: SecaoAnalise | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith("~C|")) {
        const parts = trimmed.split("|");
        if (parts.length >= 3) {
          if (currentSecao) secoes.push(currentSecao);
          currentSecao = {
            codigo: parts[1] || String(secoes.length + 1),
            nome: parts[2] || "Sem nome",
            nivel: 1,
            itens: [],
          };
        }
      }
      
      if (trimmed.startsWith("~D|") && currentSecao) {
        const parts = trimmed.split("|");
        if (parts.length >= 4) {
          currentSecao.itens.push({
            descricao: parts[2] || "",
            unidade: parts[3] || null,
            quantidade: parts[4] ? parseFloat(parts[4]) : null,
            texto_original: trimmed,
            classificacao: {},
          });
        }
      }
    }
    
    if (currentSecao) secoes.push(currentSecao);
    if (secoes.length === 0) return null;
    
    return { secoes };
  } catch {
    return null;
  }
}

async function salvarResultado(
  supabase: any,
  cadernoId: string,
  resultado: { secoes: SecaoAnalise[] }
) {
  let totalItens = 0;
  const secaoIdMap: Record<string, string> = {};

  for (let i = 0; i < resultado.secoes.length; i++) {
    const secao = resultado.secoes[i];
    const parentId = secao.parent_codigo ? secaoIdMap[secao.parent_codigo] : null;
    
    const { data: secaoData, error: secaoError } = await supabase
      .from("caderno_secoes")
      .insert({
        caderno_id: cadernoId,
        parent_id: parentId,
        codigo: secao.codigo,
        nome: secao.nome,
        nivel: secao.nivel,
        ordem: i,
      })
      .select("id")
      .single();

    if (secaoError) {
      console.error("Erro ao criar secção:", secaoError);
      continue;
    }

    secaoIdMap[secao.codigo] = secaoData.id;

    // Insert items in batches of 50 for efficiency
    const BATCH_SIZE = 50;
    for (let batchStart = 0; batchStart < secao.itens.length; batchStart += BATCH_SIZE) {
      const batch = secao.itens.slice(batchStart, batchStart + BATCH_SIZE);
      const itemsBatch = batch.map((item, j) => ({
        secao_id: secaoData.id,
        descricao_original: item.descricao,
        unidade_detectada: item.unidade,
        quantidade_detectada: item.quantidade,
        texto_original: item.texto_original,
        ordem: batchStart + j,
        status: "pendente",
        classificacao: item.classificacao || {},
      }));

      const { error: itemError, data: insertedItems } = await supabase
        .from("caderno_itens")
        .insert(itemsBatch)
        .select("id");

      if (itemError) {
        console.error(`Erro ao criar itens em lote (batch ${batchStart}):`, itemError);
        // Fallback: insert one by one
        for (const item of itemsBatch) {
          const { error: singleError } = await supabase
            .from("caderno_itens")
            .insert(item);
          if (!singleError) totalItens++;
        }
      } else {
        totalItens += insertedItems?.length || 0;
      }
    }
  }

  console.log(`Total items saved to DB: ${totalItens}`);

  await supabase
    .from("cadernos_encargos")
    .update({
      status: "analisado",
      total_itens: totalItens,
    })
    .eq("id", cadernoId);
}