import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await client.auth.getUser();
    if (authErr || !user) throw new Error("Não autenticado");

    const { file_paths, supplier_id } = await req.json();
    if (!file_paths?.length || !supplier_id) throw new Error("Parâmetros em falta");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    // Download file contents from storage
    const fileContents: string[] = [];
    for (const fp of file_paths) {
      const { data: fileData, error: dlErr } = await client.storage
        .from("supplier-pricelists")
        .download(fp);
      if (dlErr || !fileData) {
        console.error("Download error for", fp, dlErr);
        continue;
      }
      // For text-based files, read as text; for PDFs, read as base64
      const fileName = fp.toLowerCase();
      if (fileName.endsWith(".csv") || fileName.endsWith(".xls") || fileName.endsWith(".xlsx")) {
        const text = await fileData.text();
        // Take first 50k chars to avoid token limits
        fileContents.push(`--- Ficheiro: ${fp} ---\n${text.substring(0, 50000)}`);
      } else if (fileName.endsWith(".pdf")) {
        // Convert PDF to base64 for AI processing
        const buffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        fileContents.push(`--- Ficheiro PDF: ${fp} (base64, primeiros 30k chars) ---\n${b64.substring(0, 30000)}`);
      }
    }

    if (fileContents.length === 0) throw new Error("Nenhum ficheiro processado com sucesso");

    const systemPrompt = `Sou o Axia™, o motor de inteligência da plataforma ObraSys especializado em construção civil portuguesa.

A tua tarefa é analisar a tabela de preços de um fornecedor e extrair todos os itens/artigos encontrados num formato estruturado.

Para cada item extraído, retorna:
- item_code: código do artigo (se existir)
- item_name: nome/descrição do item (OBRIGATÓRIO)
- description: descrição detalhada (se disponível)
- unit: unidade de medida (m², m³, ml, un, kg, l, vg, etc.)
- base_price: preço unitário em EUR (número, sem IVA)
- vat_rate: taxa de IVA se mencionada (default 23)
- min_qty: quantidade mínima se mencionada
- lead_time_days: prazo de entrega em dias se mencionado
- notes: observações relevantes

Regras:
- Normaliza unidades para o padrão PT: m2→m², m3→m³, un→un, ml→ml, kg→kg
- Se o preço incluir IVA, calcula o preço sem IVA
- Ignora cabeçalhos, totais e linhas vazias
- Agrupa por categorias se possível
- Extrai o máximo de itens possível`;

    const userPrompt = `Analisa a seguinte tabela de preços de fornecedor e extrai todos os itens:\n\n${fileContents.join("\n\n")}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_price_items",
              description: "Extrai itens estruturados de uma tabela de preços de fornecedor",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item_code: { type: "string", description: "Código do artigo" },
                        item_name: { type: "string", description: "Nome/descrição do item" },
                        description: { type: "string", description: "Descrição detalhada" },
                        unit: { type: "string", description: "Unidade de medida" },
                        base_price: { type: "number", description: "Preço unitário sem IVA" },
                        vat_rate: { type: "number", description: "Taxa IVA" },
                        min_qty: { type: "number", description: "Quantidade mínima" },
                        lead_time_days: { type: "number", description: "Prazo entrega em dias" },
                        notes: { type: "string", description: "Observações" },
                      },
                      required: ["item_name", "unit", "base_price"],
                    },
                  },
                  summary: {
                    type: "string",
                    description: "Resumo da análise: total de itens encontrados, categorias identificadas, observações",
                  },
                },
                required: ["items", "summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_price_items" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos AI esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error(`Erro AI: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Resposta AI sem dados estruturados");

    const extracted = JSON.parse(toolCall.function.arguments);
    const items = extracted.items || [];
    const summary = extracted.summary || `${items.length} itens extraídos`;

    return new Response(
      JSON.stringify({ items, summary, total: items.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-supplier-pricelist error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
