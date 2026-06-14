/**
 * Persists Axia plan-vision results (rooms + elements) into the structured tables
 * (plan_rooms, plan_measurements) so the `plan_quantitativos_v` view (and therefore
 * the Tabela Unificada) actually contains data after analysis.
 *
 * Idempotent: removes previously persisted IA-generated rows for the same
 * (plan_import_id, page_id) before re-inserting, to avoid duplicates when the
 * user re-runs the analysis on the same sheet.
 */
import { supabase } from "@/integrations/supabase/client";
import { buildBudgetableQuantities } from "./plan-quantitativos-engine";

const TIPO_TO_COMPARTIMENTO: Record<string, "habitacao" | "servico" | "circulacao" | "tecnico"> = {
  sala: "habitacao",
  sala_cozinha: "habitacao",
  cozinha: "habitacao",
  quarto: "habitacao",
  suite: "habitacao",
  instalacao_sanitaria: "servico",
  garagem: "servico",
  arrumos: "servico",
  churrasqueira: "servico",
  terraco: "servico",
  varanda: "servico",
  exterior: "servico",
  jardim: "servico",
  piscina: "servico",
  circulacao: "circulacao",
  escada: "circulacao",
  hall: "circulacao",
  zona_tecnica: "tecnico",
  indefinido: "habitacao",
};

function mapTipoCompartimento(t?: string) {
  return TIPO_TO_COMPARTIMENTO[(t || "indefinido").toLowerCase()] ?? "habitacao";
}

export interface PersistAxiaQuantitativosArgs {
  planImportId: string;
  userId: string;
  pageId: string | null;
  floorId?: string | null;
  pageNumber?: number | null;
  analysis: any;
  ceilingHeightM?: number;
}

export async function persistAxiaQuantitativos(args: PersistAxiaQuantitativosArgs) {
  const { planImportId, userId, pageId, floorId, pageNumber, analysis } = args;
  if (!analysis || !planImportId || !userId) return { rooms: 0, measurements: 0 };

  const built = buildBudgetableQuantities(analysis, { ceilingHeightM: args.ceilingHeightM });
  if (built.rooms.length === 0 && built.openingsByDim.length === 0) {
    return { rooms: 0, measurements: 0 };
  }

  // Limpa entradas IA anteriores desta página (idempotência).
  if (pageId) {
    await supabase
      .from("plan_rooms")
      .delete()
      .eq("plan_import_id", planImportId)
      .eq("page_id", pageId)
      .eq("origem", "ia_inferida");
    await supabase
      .from("plan_measurements")
      .delete()
      .eq("plan_import_id", planImportId)
      .eq("page_id", pageId)
      .eq("measurement_origin", "axia_auto");
  }

  // Insert plan_rooms (boundary derivado do bbox quando disponível)
  const roomRows = built.rooms.map((r) => {
    const bb = r.source.bbox;
    const boundary = bb
      ? [
          { x: bb.x_min, y: bb.y_min },
          { x: bb.x_max, y: bb.y_min },
          { x: bb.x_max, y: bb.y_max },
          { x: bb.x_min, y: bb.y_max },
        ]
      : [];
    return {
      plan_import_id: planImportId,
      user_id: userId,
      page_id: pageId,
      floor_id: floorId ?? null,
      nome: r.name,
      tipo_compartimento: mapTipoCompartimento(r.tipo_normalizado),
      boundary_coords: boundary,
      area_m2: r.area_m2,
      perimetro_m: r.perimetro_m,
      pe_direito_m: r.pe_direito_m,
      estado_validacao: r.review_required ? "pendente" : "validado",
      origem: "ia_inferida" as const,
      confidence:
        (r.confidence ?? 0) >= 0.7
          ? "confirmado"
          : (r.confidence ?? 0) >= 0.4
            ? "provavel"
            : "precisa_validar",
    };
  });

  const { data: insertedRooms, error: roomsErr } = await supabase
    .from("plan_rooms")
    .insert(roomRows as any)
    .select("id, nome");
  if (roomsErr) {
    console.error("[persistAxiaQuantitativos] plan_rooms insert error", roomsErr);
  }

  const roomIdByName = new Map<string, string>();
  (insertedRooms ?? []).forEach((r: any) => roomIdByName.set(r.nome, r.id));

  // Measurements: rodapés (linha) + paredes (area) por compartimento + vãos agrupados (contagem)
  const measurementRows: any[] = [];

  for (const bb of built.baseboards) {
    if (bb.valor <= 0) continue;
    measurementRows.push({
      plan_import_id: planImportId,
      user_id: userId,
      page_id: pageId,
      floor_id: floorId ?? null,
      room_id: roomIdByName.get(bb.room_name) ?? null,
      tipo: "linha",
      coordinates: [],
      valor_bruto: bb.valor,
      unidade: "m",
      camada: "rodape",
      etiqueta: `Rodapé · ${bb.room_name}`,
      compartimento_origem: bb.room_name,
      estado_validacao: "pendente",
      measurement_origin: "axia_auto",
      confidence: "provavel",
      pagina_origem: pageNumber ?? null,
      budget_link_status: "not_linked",
      axia_status: "valid",
      estado_quantitativo: "confirmado",
      requer_validacao_tecnica: false,
    });
  }

  for (const w of built.wallSurfaces) {
    if (w.valor <= 0) continue;
    measurementRows.push({
      plan_import_id: planImportId,
      user_id: userId,
      page_id: pageId,
      floor_id: floorId ?? null,
      room_id: roomIdByName.get(w.room_name) ?? null,
      tipo: "area",
      coordinates: [],
      valor_bruto: w.valor,
      unidade: "m2",
      camada: "paredes",
      etiqueta: `Paredes · ${w.room_name}`,
      compartimento_origem: w.room_name,
      estado_validacao: "pendente",
      measurement_origin: "axia_auto",
      confidence: "provavel",
      pagina_origem: pageNumber ?? null,
      budget_link_status: "not_linked",
      axia_status: "valid",
      estado_quantitativo: "confirmado",
      requer_validacao_tecnica: false,
    });
  }

  for (const op of built.openingsByDim) {
    if (op.qtd <= 0) continue;
    measurementRows.push({
      plan_import_id: planImportId,
      user_id: userId,
      page_id: pageId,
      floor_id: floorId ?? null,
      tipo: "contagem",
      coordinates: [],
      valor_bruto: op.qtd,
      unidade: "un",
      camada: "vãos",
      etiqueta: op.label,
      estado_validacao: op.review_required ? "pendente" : "validado",
      measurement_origin: "axia_auto",
      confidence: op.review_required ? "precisa_validar" : "provavel",
      pagina_origem: pageNumber ?? null,
      budget_link_status: "not_linked",
      axia_status: "valid",
      estado_quantitativo: "confirmado",
      requer_validacao_tecnica: op.review_required,
    });
  }

  let measurementsInserted = 0;
  if (measurementRows.length > 0) {
    const { error: mErr, count } = await supabase
      .from("plan_measurements")
      .insert(measurementRows as any, { count: "exact" });
    if (mErr) {
      console.error("[persistAxiaQuantitativos] plan_measurements insert error", mErr);
    } else {
      measurementsInserted = count ?? measurementRows.length;
    }
  }

  return { rooms: insertedRooms?.length ?? 0, measurements: measurementsInserted };
}
