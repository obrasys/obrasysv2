/**
 * Fase 8 — Painel "Diagnóstico DXF".
 * Visível apenas quando o resultado da análise contém `validacao.dxf_diagnostico`
 * (i.e. o pipeline DXF foi usado). Mostra contagens, layers, textos extraídos
 * e textos não associados que precisam de revisão.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, FileSearch, AlertTriangle } from "lucide-react";

interface DxfDiagnostico {
  total_entidades?: number;
  n_text?: number;
  n_mtext?: number;
  n_attrib?: number;
  n_attdef?: number;
  n_dimension?: number;
  n_block?: number;
  n_insert?: number;
  n_textos_de_blocos?: number;
  n_textos_extraidos?: number;
  n_textos_associados?: number;
  n_textos_nao_associados?: number;
  layers_encontrados?: string[];
  layers_texto_reconhecidos?: string[];
  erros_parsing?: string[];
}

interface Compartimento {
  id: string;
  nome: string | null;
  area_declarada_m2: number | null;
  area_calculada_m2: number;
  textos_associados: Array<{ text: string; kind: string }>;
}

interface TextoNaoAssociado {
  text: string;
  kind: string;
  layer: string;
  entity_type: string;
}

interface Props {
  diagnostico: DxfDiagnostico | null | undefined;
  compartimentos?: Compartimento[];
  textosNaoAssociados?: TextoNaoAssociado[];
  className?: string;
}

const KIND_LABEL: Record<string, string> = {
  room_label: "Compartimento",
  area: "Área",
  dimension_text: "Cota",
  note: "Nota",
  legend: "Legenda",
  unknown: "Outro",
};

export function DxfDiagnosticPanel({
  diagnostico,
  compartimentos = [],
  textosNaoAssociados = [],
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  if (!diagnostico) return null;

  const filteredUnassigned = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return textosNaoAssociados;
    return textosNaoAssociados.filter(
      (t) =>
        t.text.toLowerCase().includes(q) ||
        t.layer.toLowerCase().includes(q) ||
        t.entity_type.toLowerCase().includes(q),
    );
  }, [filter, textosNaoAssociados]);

  const counts: Array<[string, number | undefined]> = [
    ["Entidades", diagnostico.total_entidades],
    ["TEXT", diagnostico.n_text],
    ["MTEXT", diagnostico.n_mtext],
    ["ATTRIB", diagnostico.n_attrib],
    ["ATTDEF", diagnostico.n_attdef],
    ["DIMENSION", diagnostico.n_dimension],
    ["BLOCK", diagnostico.n_block],
    ["INSERT", diagnostico.n_insert],
    ["Textos de blocos", diagnostico.n_textos_de_blocos],
    ["Textos extraídos", diagnostico.n_textos_extraidos],
    ["Textos associados", diagnostico.n_textos_associados],
    ["Não associados", diagnostico.n_textos_nao_associados],
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-primary" />
            Diagnóstico DXF
            {(diagnostico.n_textos_nao_associados ?? 0) > 0 && (
              <Badge variant="outline" className="ml-1 text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {diagnostico.n_textos_nao_associados} a rever
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {counts.map(([label, val]) => (
              <div
                key={label}
                className="rounded-md border bg-muted/30 px-2 py-1.5 text-xs flex flex-col"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono text-sm">{val ?? 0}</span>
              </div>
            ))}
          </div>

          {(diagnostico.layers_encontrados?.length ?? 0) > 0 && (
            <div>
              <div className="text-xs font-medium mb-1.5">
                Layers encontrados ({diagnostico.layers_encontrados!.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {diagnostico.layers_encontrados!.slice(0, 30).map((l) => (
                  <span
                    key={l}
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${
                      diagnostico.layers_texto_reconhecidos?.includes(l)
                        ? "bg-primary/10 border-primary/40"
                        : ""
                    }`}
                  >
                    {l}
                  </span>
                ))}
                {diagnostico.layers_encontrados!.length > 30 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{diagnostico.layers_encontrados!.length - 30}
                  </span>
                )}
              </div>
            </div>
          )}

          {compartimentos.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1.5">
                Compartimentos detetados ({compartimentos.length})
              </div>
              <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                {compartimentos.map((c) => (
                  <div key={c.id} className="px-2 py-1.5 text-xs flex items-center gap-2">
                    <span className="flex-1 truncate font-medium">{c.nome}</span>
                    <span className="text-muted-foreground">
                      calc {c.area_calculada_m2.toFixed(1)} m²
                    </span>
                    {c.area_declarada_m2 != null && (
                      <Badge variant="outline" className="text-[10px]">
                        decl {c.area_declarada_m2.toFixed(1)} m²
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {textosNaoAssociados.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-medium">
                  Textos não associados ({textosNaoAssociados.length}) — precisam revisão
                </div>
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filtrar..."
                  className="h-7 text-xs w-40"
                />
              </div>
              <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                {filteredUnassigned.slice(0, 200).map((t, i) => (
                  <div key={i} className="px-2 py-1 text-[11px] flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px]">
                      {KIND_LABEL[t.kind] ?? t.kind}
                    </Badge>
                    <span className="flex-1 truncate">{t.text}</span>
                    <span className="text-muted-foreground text-[10px]">{t.entity_type}</span>
                    <span className="text-muted-foreground text-[10px]">{t.layer}</span>
                  </div>
                ))}
                {filteredUnassigned.length > 200 && (
                  <div className="px-2 py-1 text-[10px] text-muted-foreground">
                    +{filteredUnassigned.length - 200} ocultos
                  </div>
                )}
              </div>
            </div>
          )}

          {(diagnostico.erros_parsing?.length ?? 0) > 0 && (
            <div>
              <div className="text-xs font-medium mb-1.5 text-destructive">
                Erros de parsing ({diagnostico.erros_parsing!.length})
              </div>
              <ul className="text-[10px] text-destructive list-disc pl-4 space-y-0.5">
                {diagnostico.erros_parsing!.slice(0, 10).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
