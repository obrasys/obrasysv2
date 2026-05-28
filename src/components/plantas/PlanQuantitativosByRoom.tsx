import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Home, CheckCircle2, XCircle, Clock, Layers, Sparkles } from "lucide-react";
import type { PlanMeasurement, PlanMeasurementMapping, PlanRoom } from "@/types/plan-measurements";
import {
  associateMeasurementsToCompartments,
  buildDerivedQuantitiesForRoom,
  type DerivedQuantity,
  type ResolvedRoom,
  type RoomMeasurementLink,
} from "@/lib/plan-compartment-association";

interface Article {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_unitario: number;
  categoria: string;
}

interface Props {
  measurements: PlanMeasurement[];
  mappings: PlanMeasurementMapping[];
  articles: Article[];
  rooms: PlanRoom[];
  roomMeasurements: RoomMeasurementLink[];
  onValidateMeasurement: (id: string, estado: "validado" | "rejeitado") => void;
}

interface MeasurementItem {
  kind: "measurement";
  measurement: PlanMeasurement;
  mapping?: PlanMeasurementMapping;
  article?: Article;
  qtdFinal: number;
  unit: string;
  valorTotal: number;
}

interface DerivedItem {
  kind: "derived";
  derived: DerivedQuantity;
  qtdFinal: number;
  unit: string;
  valorTotal: number;
}

type GroupItem = MeasurementItem | DerivedItem;

interface RoomGroup {
  room: ResolvedRoom | null;
  items: GroupItem[];
  totalValor: number;
}

const TIPO_LABELS: Record<string, string> = {
  habitacao: "Habitação",
  servico: "Serviço",
  circulacao: "Circulação",
  tecnico: "Técnico",
};

const estadoIcon = (estado: string) => {
  switch (estado) {
    case "validado":
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
    case "rejeitado":
      return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-amber-500" />;
  }
};

export function PlanQuantitativosByRoom({
  measurements,
  mappings,
  articles,
  rooms,
  roomMeasurements,
  onValidateMeasurement,
}: Props) {
  const [openRooms, setOpenRooms] = useState<Set<string>>(new Set(["__unassigned__"]));

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

  // 🆕 Fase 2: associação heurística + deduplicação de nomes
  const { measurementToRooms, resolvedRooms, stats } = useMemo(
    () => associateMeasurementsToCompartments(measurements, rooms, roomMeasurements),
    [measurements, rooms, roomMeasurements],
  );

  // Log diagnóstico - útil para perceber por que algo cai em "sem compartimento".
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.debug("[plan/by-room] association stats", stats);
  }

  const roomGroups = useMemo<RoomGroup[]>(() => {
    const groups = new Map<string, RoomGroup>();

    resolvedRooms.forEach((room) => {
      groups.set(room.id, { room, items: [], totalValor: 0 });
    });
    groups.set("__unassigned__", { room: null, items: [], totalValor: 0 });

    const presentKindsPerRoom = new Map<string, Set<DerivedQuantity["kind"]>>();

    measurements.forEach((m) => {
      const mapping = mappingByMeasurement.get(m.id);
      const article = mapping?.artigo_base_id ? articleById.get(mapping.artigo_base_id) : undefined;
      const base = m.valor_ajustado ?? m.valor_bruto;
      const qtdFinal = mapping ? base * mapping.coeficiente * mapping.fator_desperdicio : base;
      const valorTotal = article ? qtdFinal * article.preco_unitario : 0;

      const item: MeasurementItem = {
        kind: "measurement",
        measurement: m,
        mapping,
        article,
        qtdFinal,
        unit: article?.unidade ?? m.unidade,
        valorTotal,
      };

      const roomIds = measurementToRooms.get(m.id);
      if (roomIds && roomIds.length > 0) {
        roomIds.forEach((rid) => {
          const group = groups.get(rid);
          if (group) {
            group.items.push(item);
            group.totalValor += valorTotal;
            const presentKinds = presentKindsPerRoom.get(rid) ?? new Set();
            const tag = `${m.camada ?? ""} ${m.etiqueta ?? ""}`.toLowerCase();
            if (/pavimento|piso|chao|chão/.test(tag)) presentKinds.add("pavimento");
            if (/teto|tecto/.test(tag)) presentKinds.add("teto");
            if (/rodap/.test(tag)) presentKinds.add("rodape");
            if (/parede/.test(tag)) presentKinds.add("paredes");
            presentKindsPerRoom.set(rid, presentKinds);
          }
        });
      } else {
        const unassigned = groups.get("__unassigned__")!;
        unassigned.items.push(item);
        unassigned.totalValor += valorTotal;
      }
    });

    // 🆕 Quantitativos derivados (pavimento/teto/rodapé/paredes) para compartimentos
    // que tenham área/perímetro mas não tenham medições desse tipo.
    resolvedRooms.forEach((room) => {
      const present = presentKindsPerRoom.get(room.id) ?? new Set<DerivedQuantity["kind"]>();
      const derived = buildDerivedQuantitiesForRoom(room, present);
      const group = groups.get(room.id);
      if (!group) return;
      derived.forEach((d) => {
        group.items.push({
          kind: "derived",
          derived: d,
          qtdFinal: d.value,
          unit: d.unit,
          valorTotal: 0,
        });
      });
    });

    return Array.from(groups.values())
      .filter((g) => g.items.length > 0 || g.room)
      .sort((a, b) => {
        if (!a.room) return 1;
        if (!b.room) return -1;
        return a.room.display_name.localeCompare(b.room.display_name);
      });
  }, [measurements, resolvedRooms, mappingByMeasurement, articleById, measurementToRooms]);

  const totals = useMemo(() => {
    let valor = 0;
    let medicoes = 0;
    roomGroups.forEach((g) => {
      valor += g.totalValor;
      medicoes += g.items.filter((i) => i.kind === "measurement").length;
    });
    return { valor, medicoes, rooms: resolvedRooms.length };
  }, [roomGroups, resolvedRooms]);

  const toggleRoom = (id: string) => {
    setOpenRooms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totals.rooms}</p>
          <p className="text-xs text-muted-foreground">Compartimentos</p>
        </div>
        <div className="bg-muted rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totals.medicoes}</p>
          <p className="text-xs text-muted-foreground">Medições</p>
        </div>
        <div className="bg-muted rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            {totals.valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
          </p>
          <p className="text-xs text-muted-foreground">Valor estimado</p>
        </div>
      </div>

      <div className="space-y-2">
        {roomGroups.map((group) => {
          const groupId = group.room?.id ?? "__unassigned__";
          const isOpen = openRooms.has(groupId);

          return (
            <Collapsible key={groupId} open={isOpen} onOpenChange={() => toggleRoom(groupId)}>
              <div className="border rounded-lg overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left">
                    <div className="flex items-center gap-3">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      {group.room ? (
                        <Home className="w-4 h-4 text-primary" />
                      ) : (
                        <Layers className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <span className="font-medium text-sm">
                          {group.room ? group.room.display_name : "Sem compartimento"}
                        </span>
                        {group.room && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {TIPO_LABELS[group.room.tipo_compartimento] ?? group.room.tipo_compartimento}
                            {" · "}
                            {group.room.area_m2.toFixed(1)} m²
                            {" · "}
                            Per. {group.room.perimetro_m.toFixed(1)} m
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px]">
                        {group.items.length} {group.items.length === 1 ? "item" : "itens"}
                      </Badge>
                      <span className="font-mono text-sm font-medium">
                        {group.totalValor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                      </span>
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Artigo</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead>Un.</TableHead>
                        <TableHead className="text-right">P.Unit.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-24">Validação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((item) => {
                        if (item.kind === "derived") {
                          const d = item.derived;
                          return (
                            <TableRow key={d.id} className="bg-primary/[0.03]">
                              <TableCell>
                                <Sparkles className="w-3.5 h-3.5 text-primary/70" />
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{d.label}</span>
                                <span className="text-[10px] text-muted-foreground ml-1">
                                  ({d.basis})
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground italic">
                                  A definir
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-medium">
                                {d.value.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-xs">{d.unit}</TableCell>
                              <TableCell className="text-right font-mono text-xs">-</TableCell>
                              <TableCell className="text-right font-mono text-xs">-</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {d.estimated ? "Estimado" : "Calculado"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        const m = item.measurement;
                        return (
                          <TableRow key={`${groupId}-${m.id}`}>
                            <TableCell>
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: m.cor || "#3b82f6" }}
                              />
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{m.etiqueta || m.tipo}</span>
                              {m.camada && (
                                <span className="text-[10px] text-muted-foreground ml-1">({m.camada})</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.article ? (
                                <span className="text-xs">
                                  <span className="font-mono">{item.article.codigo}</span>
                                  <span className="text-muted-foreground ml-1 line-clamp-1">{item.article.descricao}</span>
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Sem artigo</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-medium">
                              {item.qtdFinal.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs">{item.unit}</TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {item.article ? `${item.article.preco_unitario.toFixed(2)} €` : "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-medium">
                              {item.valorTotal > 0 ? `${item.valorTotal.toFixed(2)} €` : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {estadoIcon(m.estado_validacao)}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  title="Validar"
                                  onClick={() => onValidateMeasurement(m.id, "validado")}
                                >
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  title="Rejeitar"
                                  onClick={() => onValidateMeasurement(m.id, "rejeitado")}
                                >
                                  <XCircle className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={6} className="text-right text-xs font-medium">
                          Subtotal {group.room?.display_name ?? "Sem compartimento"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold">
                          {group.totalValor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {roomGroups.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Sem medições para apresentar.</p>
            <p className="text-xs mt-1">Adicione medições e compartimentos na planta.</p>
          </div>
        )}
      </div>
    </div>
  );
}
