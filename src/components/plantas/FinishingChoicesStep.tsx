import { useMemo, useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Paintbrush, SquareStack, LayoutPanelTop, DoorOpen, RectangleHorizontal, Layers as LayersIcon } from "lucide-react";
import type { PlanQuantitativoRow } from "@/hooks/usePlanQuantitativos";

export type FinishingType =
  | "paredes"
  | "rodape"
  | "pavimento"
  | "teto"
  | "portas"
  | "janelas";

export interface FinishingChoice {
  /** Descrição final do artigo (sobrepõe r.descricao no envio). */
  descricao: string;
  /** Unidade efetiva. */
  unidade?: string;
  /** Preço unitário (opcional, sem preço fica 0). */
  preco_unitario?: number;
  /** Marca o artigo como pendente_definicao. */
  pendente?: boolean;
}

/** Choice indexed by quantitativo row id. */
export type FinishingChoiceMap = Map<string, FinishingChoice>;

interface Preset {
  label: string;
  descricao: string;
  unidade: string;
}

const PRESETS: Record<FinishingType, Preset[]> = {
  paredes: [
    { label: "Reboco + pintura branca", descricao: "Reboco areado fino com pintura tinta plástica branca em paredes interiores", unidade: "m²" },
    { label: "Estuque + pintura", descricao: "Estuque projetado liso com pintura plástica acetinada em paredes", unidade: "m²" },
    { label: "Azulejo cerâmico", descricao: "Revestimento em azulejo cerâmico 30x60 assente com cimento-cola, juntas refechadas", unidade: "m²" },
    { label: "Pladur duplo", descricao: "Forra interior em pladur 12,5 mm sobre estrutura metálica, isolada com lã mineral", unidade: "m²" },
  ],
  rodape: [
    { label: "Rodapé MDF lacado branco 8 cm", descricao: "Rodapé em MDF hidrófugo 8 cm lacado branco, assente com cola e remates", unidade: "ml" },
    { label: "Rodapé cerâmico", descricao: "Rodapé cerâmico 7 cm a condizer com pavimento, assente e rejuntado", unidade: "ml" },
    { label: "Rodapé madeira maciça", descricao: "Rodapé em madeira maciça 10 cm envernizado, assente com pregagem oculta", unidade: "ml" },
  ],
  pavimento: [
    { label: "Cerâmico 60x60 retificado", descricao: "Pavimento cerâmico retificado 60x60 assente com cimento-cola, juntas finas", unidade: "m²" },
    { label: "Flutuante AC4", descricao: "Pavimento flutuante laminado AC4 8 mm com manta acústica e rodapé incluído", unidade: "m²" },
    { label: "Madeira maciça envernizada", descricao: "Soalho em madeira maciça assente e envernizado in situ", unidade: "m²" },
    { label: "Microcimento", descricao: "Pavimento em microcimento aplicado em 2 demãos com primário e verniz selante", unidade: "m²" },
  ],
  teto: [
    { label: "Estuque + pintura branca", descricao: "Teto em estuque com pintura plástica branca", unidade: "m²" },
    { label: "Teto falso pladur", descricao: "Teto falso em pladur 12,5 mm sobre estrutura metálica, com pintura acabada", unidade: "m²" },
    { label: "Teto falso acústico", descricao: "Teto falso modular acústico 60x60 sobre estrutura T24 vista", unidade: "m²" },
  ],
  portas: [
    { label: "Porta interior lacada", descricao: "Porta interior em MDF lacado branco com aro, guarnições e ferragens", unidade: "un" },
    { label: "Porta de entrada blindada", descricao: "Porta de entrada blindada classe 3 com aro metálico e fechadura multi-ponto", unidade: "un" },
    { label: "Porta de correr embutida", descricao: "Porta de correr embutida em parede com sistema oculto e guias", unidade: "un" },
  ],
  janelas: [
    { label: "Janela PVC oscilo-batente vidro duplo", descricao: "Janela em PVC com vidro duplo 4/16/4, oscilo-batente, com estore exterior", unidade: "un" },
    { label: "Janela alumínio RPT", descricao: "Janela em alumínio com rotura de ponte térmica, vidro duplo low-E", unidade: "un" },
    { label: "Janela madeira tradicional", descricao: "Janela em madeira pinho tratado, vidro duplo, ferragens em latão", unidade: "un" },
  ],
};

const TYPE_META: Record<FinishingType, { label: string; icon: typeof Paintbrush }> = {
  paredes: { label: "Paredes", icon: Paintbrush },
  rodape: { label: "Rodapé", icon: SquareStack },
  pavimento: { label: "Pavimento", icon: LayersIcon },
  teto: { label: "Teto", icon: LayoutPanelTop },
  portas: { label: "Portas", icon: DoorOpen },
  janelas: { label: "Janelas", icon: RectangleHorizontal },
};

const KEYWORDS: Record<FinishingType, string[]> = {
  paredes: ["parede", "wall"],
  rodape: ["rodape", "rodapé", "skirting"],
  pavimento: ["pavimento", "piso", "floor", "soalho", "chao", "chão"],
  teto: ["teto", "tecto", "ceiling"],
  portas: ["porta", "door"],
  janelas: ["janela", "vão", "vao", "window"],
};

function inferType(row: PlanQuantitativoRow): FinishingType | null {
  const text = `${row.camada ?? ""} ${row.descricao ?? ""}`.toLowerCase();
  for (const [type, kws] of Object.entries(KEYWORDS) as [FinishingType, string[]][]) {
    if (kws.some((k) => text.includes(k))) return type;
  }
  return null;
}

interface Props {
  rows: PlanQuantitativoRow[];
  /** Ids de medições já mapeadas a um artigo da Base (não precisam de escolha). */
  mappedMeasurementIds: Set<string>;
  value: FinishingChoiceMap;
  onChange: (next: FinishingChoiceMap) => void;
}

/**
 * Step opcional antes do envio para orçamento (Fase 4).
 * Agrupa linhas sem mapeamento por tipo de acabamento e oferece presets.
 * "Definir depois" marca o item como pendente_definicao no envio.
 */
export function FinishingChoicesStep({ rows, mappedMeasurementIds, value, onChange }: Props) {
  const groups = useMemo(() => {
    const map = new Map<FinishingType, PlanQuantitativoRow[]>();
    for (const r of rows) {
      if (r.source === "medicao" && mappedMeasurementIds.has(r.id)) continue;
      const type = inferType(r);
      if (!type) continue;
      const arr = map.get(type) ?? [];
      arr.push(r);
      map.set(type, arr);
    }
    return map;
  }, [rows, mappedMeasurementIds]);

  // Default: tudo "pendente" até o user escolher.
  useEffect(() => {
    if (groups.size === 0) return;
    const next = new Map(value);
    let changed = false;
    for (const [, items] of groups) {
      for (const r of items) {
        if (!next.has(r.id)) {
          next.set(r.id, { descricao: r.descricao, unidade: r.unidade, pendente: true });
          changed = true;
        }
      }
    }
    if (changed) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  if (groups.size === 0) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Não foram detetados acabamentos por definir. Pode enviar diretamente.
      </div>
    );
  }

  const applyToGroup = (type: FinishingType, items: PlanQuantitativoRow[], presetIdx: number | "pendente") => {
    const next = new Map(value);
    for (const r of items) {
      if (presetIdx === "pendente") {
        next.set(r.id, { descricao: r.descricao, unidade: r.unidade, pendente: true });
      } else {
        const preset = PRESETS[type][presetIdx];
        next.set(r.id, { descricao: preset.descricao, unidade: preset.unidade, pendente: false });
      }
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Escolha um acabamento para cada tipo. Pode deixar como
        <Badge variant="outline" className="text-[10px]">pendente</Badge>
        para definir mais tarde.
      </div>

      {Array.from(groups.entries()).map(([type, items]) => {
        const meta = TYPE_META[type];
        const Icon = meta.icon;
        // Detect current selection (assume homogeneous per group, take first).
        const current = value.get(items[0].id);
        const currentIdx = current?.pendente
          ? "pendente"
          : PRESETS[type].findIndex((p) => p.descricao === current?.descricao);
        const selectValue =
          currentIdx === "pendente" || currentIdx === -1 || currentIdx === undefined
            ? "pendente"
            : String(currentIdx);

        return (
          <div key={type} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon className="h-4 w-4 text-primary" />
                {meta.label}
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {items.length} item(s)
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Solução técnica</Label>
              <Select
                value={selectValue}
                onValueChange={(v) =>
                  applyToGroup(type, items, v === "pendente" ? "pendente" : Number(v))
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS[type].map((p, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {p.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="pendente">
                    Definir depois (pendente)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      })}
    </div>
  );
}
