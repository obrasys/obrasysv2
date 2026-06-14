import { useMemo, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Paintbrush, SquareStack, LayoutPanelTop, DoorOpen, RectangleHorizontal, Layers as LayersIcon } from "lucide-react";
import type { PlanQuantitativoRow } from "@/hooks/usePlanQuantitativos";

export type FinishingType =
  | "paredes"
  | "rodape"
  | "pavimento"
  | "teto"
  | "portas"
  | "janelas";

export interface FinishingChoiceItem {
  descricao: string;
  unidade?: string;
  preco_unitario?: number;
  pendente?: boolean;
}

/** Cada quantitativo pode produzir vários artigos (ex.: parede = barramento + pintura). */
export type FinishingChoiceMap = Map<string, FinishingChoiceItem[]>;

interface Preset {
  label: string;
  descricao: string;
  unidade: string;
}

const PRESETS: Record<FinishingType, Preset[]> = {
  paredes: [
    { label: "Reboco areado", descricao: "Reboco areado fino em paredes interiores", unidade: "m²" },
    { label: "Barramento / estuque", descricao: "Barramento de paredes com massa de acabamento", unidade: "m²" },
    { label: "Primário", descricao: "Aplicação de primário selante em paredes", unidade: "m²" },
    { label: "Pintura tinta plástica branca", descricao: "Pintura em tinta plástica branca, duas demãos", unidade: "m²" },
    { label: "Azulejo cerâmico 30x60", descricao: "Revestimento em azulejo cerâmico 30x60 assente com cimento-cola", unidade: "m²" },
    { label: "Pladur 12,5 mm", descricao: "Forra interior em pladur 12,5 mm sobre estrutura metálica", unidade: "m²" },
  ],
  rodape: [
    { label: "Rodapé MDF lacado branco 8 cm", descricao: "Rodapé em MDF hidrófugo 8 cm lacado branco", unidade: "ml" },
    { label: "Rodapé cerâmico 7 cm", descricao: "Rodapé cerâmico 7 cm a condizer com pavimento", unidade: "ml" },
    { label: "Rodapé madeira maciça", descricao: "Rodapé em madeira maciça 10 cm envernizado", unidade: "ml" },
  ],
  pavimento: [
    { label: "Betonilha de regularização", descricao: "Betonilha de regularização do pavimento", unidade: "m²" },
    { label: "Cerâmico 60x60 retificado", descricao: "Pavimento cerâmico retificado 60x60 assente com cimento-cola", unidade: "m²" },
    { label: "Flutuante AC4", descricao: "Pavimento flutuante laminado AC4 8 mm com manta acústica", unidade: "m²" },
    { label: "Madeira maciça envernizada", descricao: "Soalho em madeira maciça envernizado in situ", unidade: "m²" },
    { label: "Microcimento", descricao: "Pavimento em microcimento aplicado em duas demãos com selante", unidade: "m²" },
  ],
  teto: [
    { label: "Estuque", descricao: "Teto em estuque pronto a pintar", unidade: "m²" },
    { label: "Pintura branca", descricao: "Pintura de teto em tinta plástica branca, duas demãos", unidade: "m²" },
    { label: "Teto falso pladur", descricao: "Teto falso em pladur 12,5 mm sobre estrutura metálica", unidade: "m²" },
    { label: "Teto falso acústico 60x60", descricao: "Teto falso modular acústico 60x60 sobre estrutura T24", unidade: "m²" },
  ],
  portas: [
    { label: "Porta interior lacada", descricao: "Porta interior em MDF lacado branco com aro, guarnições e ferragens", unidade: "un" },
    { label: "Porta de entrada blindada", descricao: "Porta de entrada blindada classe 3 com fechadura multi-ponto", unidade: "un" },
    { label: "Porta de correr embutida", descricao: "Porta de correr embutida em parede com sistema oculto", unidade: "un" },
  ],
  janelas: [
    { label: "Janela PVC oscilo-batente vidro duplo", descricao: "Janela PVC vidro duplo 4/16/4, oscilo-batente, com estore", unidade: "un" },
    { label: "Janela alumínio RPT", descricao: "Janela alumínio com rotura de ponte térmica, vidro duplo low-E", unidade: "un" },
    { label: "Janela madeira tradicional", descricao: "Janela em madeira pinho tratado, vidro duplo, ferragens em latão", unidade: "un" },
  ],
};

const TYPE_META: Record<FinishingType, { label: string; icon: typeof Paintbrush }> = {
  paredes: { label: "Paredes", icon: Paintbrush },
  rodape: { label: "Rodapé", icon: SquareStack },
  pavimento: { label: "Pavimento / Piso", icon: LayersIcon },
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
  mappedMeasurementIds: Set<string>;
  value: FinishingChoiceMap;
  onChange: (next: FinishingChoiceMap) => void;
}

/**
 * Step opcional antes do envio para orçamento.
 * Agrupa linhas sem mapeamento por tipo de acabamento e permite selecionar
 * MÚLTIPLOS artigos por tipo (ex.: paredes = barramento + pintura).
 * Sem seleção → artigo pendente_definicao.
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
          next.set(r.id, [{ descricao: r.descricao, unidade: r.unidade, pendente: true }]);
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

  const togglePreset = (type: FinishingType, items: PlanQuantitativoRow[], presetIdx: number, checked: boolean) => {
    const preset = PRESETS[type][presetIdx];
    const next = new Map(value);
    for (const r of items) {
      const current = (next.get(r.id) ?? []).filter((c) => !c.pendente);
      let updated: FinishingChoiceItem[];
      if (checked) {
        if (current.some((c) => c.descricao === preset.descricao)) {
          updated = current;
        } else {
          updated = [...current, { descricao: preset.descricao, unidade: preset.unidade, pendente: false }];
        }
      } else {
        updated = current.filter((c) => c.descricao !== preset.descricao);
      }
      if (updated.length === 0) {
        next.set(r.id, [{ descricao: r.descricao, unidade: r.unidade, pendente: true }]);
      } else {
        next.set(r.id, updated);
      }
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Marque um ou vários acabamentos por tipo (ex.: paredes = barramento + pintura).
        Sem seleção → fica
        <Badge variant="outline" className="text-[10px]">pendente</Badge>.
      </div>

      {Array.from(groups.entries()).map(([type, items]) => {
        const meta = TYPE_META[type];
        const Icon = meta.icon;
        const current = value.get(items[0].id) ?? [];
        const selectedDescriptions = new Set(current.filter((c) => !c.pendente).map((c) => c.descricao));

        return (
          <div key={type} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon className="h-4 w-4 text-primary" />
                {meta.label}
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {items.length} compartimento(s) · {selectedDescriptions.size || "pendente"} artigo(s)
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">
                Soluções técnicas a incluir
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {PRESETS[type].map((p, i) => {
                  const checked = selectedDescriptions.has(p.descricao);
                  return (
                    <label
                      key={i}
                      className="flex items-start gap-2 rounded-md border px-2.5 py-2 cursor-pointer hover:bg-muted/40 text-xs"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => togglePreset(type, items, i, v === true)}
                        className="mt-0.5"
                      />
                      <span>{p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
