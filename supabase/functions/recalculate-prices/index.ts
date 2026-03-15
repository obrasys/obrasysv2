import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting price recalculation job...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get materials with new prices in last 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentPrices, error: pricesError } = await supabase
      .from("material_price_raw")
      .select("material_id, region_id")
      .gte("created_at", yesterday)
      .eq("status", "pending");

    if (pricesError) throw pricesError;

    const uniquePairs = [...new Set(
      (recentPrices || []).map(p => `${p.material_id}|${p.region_id}`)
    )];

    console.log(`Found ${uniquePairs.length} material-region pairs to recalculate`);

    for (const pair of uniquePairs) {
      const [materialId, regionId] = pair.split("|");
      await recalculatePrice(supabase, materialId, regionId);
    }

    return new Response(
      JSON.stringify({ success: true, processed: uniquePairs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in recalculate-prices:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function recalculatePrice(supabase: any, materialId: string, regionId: string) {
  console.log(`Recalculating for material ${materialId}, region ${regionId}`);

  // Get all raw prices for this material/region (not rejected)
  const { data: rawPrices, error } = await supabase
    .from("material_price_raw")
    .select("*, source:price_sources(base_weight)")
    .eq("material_id", materialId)
    .eq("region_id", regionId)
    .neq("status", "rejected");

  if (error || !rawPrices?.length) {
    console.log("No valid prices found");
    return;
  }

  // Calculate median
  const prices = rawPrices.map((p: any) => p.preco_normalizado || p.preco);
  prices.sort((a: number, b: number) => a - b);
  const median = prices[Math.floor(prices.length / 2)];

  // Mark outliers (±30% of median)
  const validPrices: any[] = [];
  for (const price of rawPrices) {
    const value = price.preco_normalizado || price.preco;
    const deviation = Math.abs(value - median) / median;
    
    if (deviation > 0.3) {
      await supabase.from("material_price_raw").update({ status: "rejected", motivo_rejeicao: "Outlier (±30% da mediana)" }).eq("id", price.id);
    } else {
      // Penalize old prices (>90 days)
      const age = (Date.now() - new Date(price.data_referencia).getTime()) / (1000 * 60 * 60 * 24);
      if (age > 90) {
        await supabase.from("material_price_raw").update({ status: "penalized" }).eq("id", price.id);
        price.weight = (price.source?.base_weight || 1) * 0.5;
      } else {
        await supabase.from("material_price_raw").update({ status: "accepted" }).eq("id", price.id);
        price.weight = price.source?.base_weight || 1;
      }
      validPrices.push(price);
    }
  }

  if (!validPrices.length) return;

  // Calculate weighted average
  let totalWeight = 0;
  let weightedSum = 0;
  const values: number[] = [];

  for (const p of validPrices) {
    const value = p.preco_normalizado || p.preco;
    weightedSum += value * p.weight;
    totalWeight += p.weight;
    values.push(value);
  }

  values.sort((a, b) => a - b);
  const precoMedio = weightedSum / totalWeight;
  const p10 = values[Math.floor(values.length * 0.1)] || values[0];
  const p50 = values[Math.floor(values.length * 0.5)];
  const p90 = values[Math.ceil(values.length * 0.9) - 1] || values[values.length - 1];

  // Calculate confidence (0-100)
  const sampleScore = Math.min(validPrices.length * 10, 30);
  const recencyScore = validPrices.filter((p: any) => {
    const age = (Date.now() - new Date(p.data_referencia).getTime()) / (1000 * 60 * 60 * 24);
    return age < 30;
  }).length / validPrices.length * 30;
  const consistencyScore = (1 - (p90 - p10) / precoMedio) * 40;
  const confidenceScore = Math.min(100, Math.max(0, Math.round(sampleScore + recencyScore + consistencyScore)));

  // Upsert reference price
  await supabase.from("material_price_reference").upsert({
    material_id: materialId,
    region_id: regionId,
    preco_medio: precoMedio,
    preco_p10: p10,
    preco_p50: p50,
    preco_p90: p90,
    sample_size: validPrices.length,
    confidence_score: confidenceScore,
    ultima_atualizacao: new Date().toISOString(),
  }, { onConflict: "material_id,region_id" });

  // Log audit
  await supabase.from("price_audit_log").insert({
    material_id: materialId,
    region_id: regionId,
    acao: "recalculated",
    detalhes: { preco_medio: precoMedio, sample_size: validPrices.length, confidence_score: confidenceScore },
    executado_por: "system",
  });

  console.log(`Updated reference price: €${precoMedio.toFixed(2)}, confidence: ${confidenceScore}%`);
}
