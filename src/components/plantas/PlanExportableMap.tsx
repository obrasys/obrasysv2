import { useMemo, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { PlanMeasurement, PlanMeasurementMapping, PlanRoom } from "@/types/plan-measurements";

interface Article {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_unitario: number;
  categoria: string;
}

interface RoomMeasurementLink {
  room_id: string;
  measurement_id: string;
}

interface Props {
  measurements: PlanMeasurement[];
  mappings: PlanMeasurementMapping[];
  articles: Article[];
  rooms: PlanRoom[];
  roomMeasurements: RoomMeasurementLink[];
  planName: string;
}

interface MapRow {
  roomName: string;
  measurementLabel: string;
  tipo: string;
  camada: string;
  valorBruto: number;
  valorAjustado: number;
  unidadeMedicao: string;
  artigoCodigo: string;
  artigoDescricao: string;
  artigoUnidade: string;
  fatorDesperdicio: number;
  coeficiente: number;
  qtdFinal: number;
  precoUnitario: number;
  valorTotal: number;
  estado: string;
}

export function PlanExportableMap({
  measurements,
  mappings,
  articles,
  rooms,
  roomMeasurements,
  planName,
}: Props) {
  const tableRef = useRef<HTMLDivElement>(null);

  const articleById = useMemo(() => {
    const map = new Map<string, Article>();
    articles.forEach((a) => map.set(a.id, a));
    return map;
  }, [articles]);

  const mappingByMeasurement = useMemo(() => {
    const map = new Map<string, PlanMeasurementMapping>();
    mappings.forEach((m) => map.set(m.measurement_id, m));
    return map;
  }, [mappings]);

  const roomById = useMemo(() => {
    const map = new Map<string, PlanRoom>();
    rooms.forEach((r) => map.set(r.id, r));
    return map;
  }, [rooms]);

  const measurementRoomMap = useMemo(() => {
    const map = new Map<string, string>();
    roomMeasurements.forEach((rm) => {
      // Take first room association
      if (!map.has(rm.measurement_id)) map.set(rm.measurement_id, rm.room_id);
    });
    return map;
  }, [roomMeasurements]);

  const rows = useMemo<MapRow[]>(() => {
    return measurements.map((m) => {
      const mapping = mappingByMeasurement.get(m.id);
      const article = mapping?.artigo_base_id ? articleById.get(mapping.artigo_base_id) : undefined;
      const roomId = measurementRoomMap.get(m.id);
      const room = roomId ? roomById.get(roomId) : undefined;
      const base = m.valor_ajustado ?? m.valor_bruto;
      const fator = mapping?.fator_desperdicio ?? 1;
      const coef = mapping?.coeficiente ?? 1;
      const qtdFinal = base * fator * coef;

      return {
        roomName: room?.nome ?? "—",
        measurementLabel: m.etiqueta || m.tipo,
        tipo: m.tipo,
        camada: m.camada || "—",
        valorBruto: m.valor_bruto,
        valorAjustado: m.valor_ajustado ?? m.valor_bruto,
        unidadeMedicao: m.unidade,
        artigoCodigo: article?.codigo ?? "—",
        artigoDescricao: article?.descricao ?? "—",
        artigoUnidade: article?.unidade ?? m.unidade,
        fatorDesperdicio: fator,
        coeficiente: coef,
        qtdFinal,
        precoUnitario: article?.preco_unitario ?? 0,
        valorTotal: article ? qtdFinal * article.preco_unitario : 0,
        estado: mapping?.estado ?? "por_mapear",
      };
    }).sort((a, b) => a.roomName.localeCompare(b.roomName));
  }, [measurements, mappingByMeasurement, articleById, measurementRoomMap, roomById]);

  const grandTotal = useMemo(() => rows.reduce((s, r) => s + r.valorTotal, 0), [rows]);

  const handleExportCSV = () => {
    const headers = [
      "Compartimento", "Medição", "Tipo", "Camada",
      "Valor Bruto", "Valor Ajustado", "Un. Medição",
      "Cód. Artigo", "Descrição Artigo", "Un. Artigo",
      "F. Desperdício", "Coeficiente", "Qtd Final",
      "P. Unitário", "Total", "Estado",
    ];
    const csvRows = rows.map((r) => [
      r.roomName, r.measurementLabel, r.tipo, r.camada,
      r.valorBruto.toFixed(2), r.valorAjustado.toFixed(2), r.unidadeMedicao,
      r.artigoCodigo, `"${r.artigoDescricao}"`, r.artigoUnidade,
      r.fatorDesperdicio.toFixed(2), r.coeficiente.toFixed(2), r.qtdFinal.toFixed(2),
      r.precoUnitario.toFixed(2), r.valorTotal.toFixed(2), r.estado,
    ].join(";"));

    const csv = [headers.join(";"), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quantitativos_${planName.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} linhas · Total:{" "}
          <span className="font-medium text-foreground">
            {grandTotal.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
          </span>
        </p>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExportCSV}>
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto" ref={tableRef}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comp.</TableHead>
              <TableHead>Medição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Camada</TableHead>
              <TableHead className="text-right">Bruto</TableHead>
              <TableHead className="text-right">Ajust.</TableHead>
              <TableHead>Artigo</TableHead>
              <TableHead className="text-right">Desp.</TableHead>
              <TableHead className="text-right">Coef.</TableHead>
              <TableHead className="text-right">Qtd Final</TableHead>
              <TableHead className="text-right">P.Unit.</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs">{r.roomName}</TableCell>
                <TableCell className="text-xs font-medium">{r.measurementLabel}</TableCell>
                <TableCell className="text-[10px]">{r.tipo}</TableCell>
                <TableCell className="text-[10px] text-muted-foreground">{r.camada}</TableCell>
                <TableCell className="text-right font-mono text-[11px]">{r.valorBruto.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-[11px]">{r.valorAjustado.toFixed(2)}</TableCell>
                <TableCell className="text-[10px] max-w-32 truncate">
                  {r.artigoCodigo !== "—" ? `${r.artigoCodigo} — ${r.artigoDescricao}` : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-[10px]">×{r.fatorDesperdicio.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-[10px]">×{r.coeficiente.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-xs font-medium">{r.qtdFinal.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-[11px]">
                  {r.precoUnitario > 0 ? `${r.precoUnitario.toFixed(2)} €` : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-medium">
                  {r.valorTotal > 0 ? `${r.valorTotal.toFixed(2)} €` : "—"}
                </TableCell>
              </TableRow>
            ))}
            {/* Grand total */}
            <TableRow className="bg-muted/50 font-bold">
              <TableCell colSpan={11} className="text-right text-xs">Total Geral</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {grandTotal.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
