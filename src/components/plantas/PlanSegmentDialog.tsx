import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Hammer, Wrench, Paintbrush, Layers, Brush } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SegmentAction = "demolir" | "construir" | "barrar" | "pintar" | "revestir";

export interface SegmentSavePayload {
  comprimento_m: number;
  pe_direito_m: number;
  area_bruta_m2: number;
  area_liquida_m2: number;
  aberturas_m2: number;
  acao: SegmentAction;
  espessura_cm: number | null;
  material_label: string | null;
  material_id: string | null;
  volume_demolicao_m3: number | null;
  etiqueta: string;
  camada: string | null;
  observacao: string;
}

interface AberturaCalc {
  id: string;
  tipo: "janela" | "porta";
  largura: string;
  altura: string;
}

const ACTIONS: Array<{ id: SegmentAction; label: string; icon: typeof Hammer; tone: string }> = [
  { id: "demolir", label: "Demolir", icon: Hammer, tone: "text-destructive" },
  { id: "construir", label: "Construir", icon: Wrench, tone: "text-primary" },
  { id: "barrar", label: "Barrar", icon: Layers, tone: "text-amber-600" },
  { id: "pintar", label: "Pintar", icon: Paintbrush, tone: "text-blue-600" },
  { id: "revestir", label: "Revestir", icon: Brush, tone: "text-purple-600" },
];

const FALLBACK_MATERIALS = [
  "Tijolo cerâmico furado",
  "Tijolo cerâmico maciço",
  "Bloco de betão",
  "Bloco térmico",
  "Pladur (gesso cartonado)",
  "Madeira",
  "Outro",
];

export interface SegmentInitialValues {
  pe_direito_m?: number;
  acao?: SegmentAction;
  espessura_cm?: number | null;
  material_id?: string | null;
  material_label?: string | null;
  etiqueta?: string;
  aberturas_m2?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  comprimentoMetros: number;
  onConfirm: (payload: SegmentSavePayload) => Promise<void> | void;
  isSaving?: boolean;
  mode?: "create" | "edit";
  initialValues?: SegmentInitialValues | null;
}

export function PlanSegmentDialog({ open, onClose, comprimentoMetros, onConfirm, isSaving, mode = "create", initialValues }: Props) {
  const [peDireito, setPeDireito] = useState("2.70");
  const [aberturas, setAberturas] = useState<AberturaCalc[]>([]);
  const [acao, setAcao] = useState<SegmentAction>("construir");
  const [espessura, setEspessura] = useState("11");
  const [materialId, setMaterialId] = useState<string>("__fallback:Tijolo cerâmico furado");
  const [etiqueta, setEtiqueta] = useState("");

  // Hydrate from initialValues when opening in edit mode
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialValues) {
      if (initialValues.pe_direito_m != null) setPeDireito(String(initialValues.pe_direito_m));
      if (initialValues.acao) setAcao(initialValues.acao);
      if (initialValues.espessura_cm != null) setEspessura(String(initialValues.espessura_cm));
      if (initialValues.material_id) {
        setMaterialId(initialValues.material_id);
      } else if (initialValues.material_label) {
        setMaterialId(`__fallback:${initialValues.material_label}`);
      }
      if (initialValues.etiqueta) setEtiqueta(initialValues.etiqueta);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  // Fetch a small subset of materials likely relevant for walls
  const materialsQuery = useQuery({
    queryKey: ["plan-wall-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, nome, unidade_base")
        .or("nome.ilike.%tijolo%,nome.ilike.%bloco%,nome.ilike.%pladur%,nome.ilike.%gesso%,nome.ilike.%madeira%,nome.ilike.%alvenaria%")
        .eq("ativo", true)
        .limit(50);
      if (error) return [] as Array<{ id: string; nome: string; unidade_base: string }>;
      return (data ?? []) as Array<{ id: string; nome: string; unidade_base: string }>;
    },
    enabled: open && acao === "construir",
    staleTime: 5 * 60 * 1000,
  });

  const peDireitoNum = Math.max(0, parseFloat(peDireito) || 0);
  const espessuraNum = Math.max(0, parseFloat(espessura) || 0);
  const areaBruta = comprimentoMetros * peDireitoNum;
  const aberturasArea = aberturas.reduce((s, a) => s + (parseFloat(a.largura) || 0) * (parseFloat(a.altura) || 0), 0);
  const areaLiquida = Math.max(0, areaBruta - aberturasArea);
  const volumeDemolicao = acao === "demolir" ? areaLiquida * (espessuraNum / 100) : 0;

  const materialOptions = useMemo(() => {
    const fromDb = materialsQuery.data ?? [];
    return [
      ...fromDb.map((m) => ({ id: m.id, label: m.nome, fromDb: true })),
      ...FALLBACK_MATERIALS.map((m) => ({ id: `__fallback:${m}`, label: m, fromDb: false })),
    ];
  }, [materialsQuery.data]);

  const addAbertura = (tipo: "janela" | "porta") => {
    setAberturas((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        tipo,
        largura: tipo === "porta" ? "0.80" : "1.20",
        altura: tipo === "porta" ? "2.10" : "1.20",
      },
    ]);
  };
  const updateAbertura = (id: string, patch: Partial<AberturaCalc>) =>
    setAberturas((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const removeAbertura = (id: string) => setAberturas((prev) => prev.filter((a) => a.id !== id));

  const handleConfirm = async () => {
    const selected = materialOptions.find((m) => m.id === materialId);
    const materialLabel = acao === "construir" ? selected?.label ?? null : null;
    const materialDbId = acao === "construir" && selected?.fromDb ? selected.id : null;

    const obsParts: string[] = [];
    obsParts.push(`Ação: ${acao}`);
    obsParts.push(`L=${comprimentoMetros.toFixed(2)} m × h=${peDireitoNum.toFixed(2)} m = ${areaBruta.toFixed(2)} m²`);
    if (aberturas.length > 0) obsParts.push(`Aberturas: ${aberturas.length} (−${aberturasArea.toFixed(2)} m²) → líquido ${areaLiquida.toFixed(2)} m²`);
    if (acao === "demolir") obsParts.push(`Espessura ${espessuraNum.toFixed(1)} cm → volume ${volumeDemolicao.toFixed(3)} m³`);
    if (acao === "construir" && materialLabel) obsParts.push(`Material: ${materialLabel}${espessuraNum > 0 ? ` (e=${espessuraNum.toFixed(1)} cm)` : ""}`);

    await onConfirm({
      comprimento_m: parseFloat(comprimentoMetros.toFixed(4)),
      pe_direito_m: peDireitoNum,
      area_bruta_m2: parseFloat(areaBruta.toFixed(4)),
      area_liquida_m2: parseFloat(areaLiquida.toFixed(4)),
      aberturas_m2: parseFloat(aberturasArea.toFixed(4)),
      acao,
      espessura_cm: acao === "demolir" || acao === "construir" ? espessuraNum : null,
      material_label: materialLabel,
      material_id: materialDbId,
      volume_demolicao_m3: acao === "demolir" ? parseFloat(volumeDemolicao.toFixed(4)) : null,
      etiqueta: etiqueta.trim() || `Segmento — ${acao}`,
      camada: "paredes",
      observacao: obsParts.join(" · "),
    });

    // reset
    setPeDireito("2.70");
    setAberturas([]);
    setAcao("construir");
    setEspessura("11");
    setMaterialId("__fallback:Tijolo cerâmico furado");
    setEtiqueta("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {mode === "edit" ? "Editar segmento de parede" : "Segmento de parede"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Metric summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Comprimento</p>
              <p className="text-lg font-bold tabular-nums">{comprimentoMetros.toFixed(2)} <span className="text-[11px] font-normal text-muted-foreground">m</span></p>
            </div>
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Área bruta</p>
              <p className="text-lg font-bold tabular-nums">{areaBruta.toFixed(2)} <span className="text-[11px] font-normal text-muted-foreground">m²</span></p>
            </div>
            <div className="bg-primary/10 rounded-lg p-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wide text-primary/70">Área líquida</p>
              <p className="text-lg font-bold text-primary tabular-nums">{areaLiquida.toFixed(2)} <span className="text-[11px] font-normal text-primary/70">m²</span></p>
            </div>
          </div>

          {/* Pé direito */}
          <div className="space-y-1.5">
            <Label className="text-xs">Pé direito h (m)</Label>
            <Input type="number" step="0.01" min="0" value={peDireito} onChange={(e) => setPeDireito(e.target.value)} className="h-9" />
          </div>

          {/* Aberturas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Aberturas (a subtrair)</Label>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => addAbertura("janela")}>+ Janela</Button>
                <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => addAbertura("porta")}>+ Porta</Button>
              </div>
            </div>
            {aberturas.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">Sem aberturas.</p>
            ) : (
              <div className="space-y-2">
                {aberturas.map((a) => {
                  const ar = (parseFloat(a.largura) || 0) * (parseFloat(a.altura) || 0);
                  return (
                    <div key={a.id} className="grid grid-cols-[60px_1fr_1fr_70px_28px] items-end gap-2">
                      <div className="text-[11px] font-medium pb-2">{a.tipo === "janela" ? "Janela" : "Porta"}</div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">L (m)</Label>
                        <Input type="number" step="0.01" min="0" value={a.largura} onChange={(e) => updateAbertura(a.id, { largura: e.target.value })} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">A (m)</Label>
                        <Input type="number" step="0.01" min="0" value={a.altura} onChange={(e) => updateAbertura(a.id, { altura: e.target.value })} className="h-8 text-xs" />
                      </div>
                      <div className="text-[11px] text-right pb-2 font-medium tabular-nums">{ar.toFixed(2)} m²</div>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-7" onClick={() => removeAbertura(a.id)} aria-label="Remover">×</Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action */}
          <div className="space-y-2">
            <Label className="text-xs">Ação construtiva</Label>
            <RadioGroup value={acao} onValueChange={(v) => setAcao(v as SegmentAction)} className="grid grid-cols-5 gap-1.5">
              {ACTIONS.map((a) => (
                <label
                  key={a.id}
                  className={`flex flex-col items-center gap-1 rounded-md border px-1.5 py-2 cursor-pointer transition-all text-[11px] ${
                    acao === a.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={a.id} className="sr-only" />
                  <a.icon className={`w-4 h-4 ${a.tone}`} />
                  <span className="font-medium text-foreground">{a.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Action-specific fields */}
          {acao === "demolir" && (
            <div className="border rounded-lg p-3 space-y-2.5 bg-card">
              <div className="space-y-1.5">
                <Label className="text-xs">Espessura da parede (cm)</Label>
                <Input type="number" step="0.5" min="0" value={espessura} onChange={(e) => setEspessura(e.target.value)} className="h-9" />
              </div>
              <div className="rounded-md bg-destructive/5 p-2.5 text-xs flex items-center justify-between">
                <span className="text-muted-foreground">Volume a remover</span>
                <span className="font-bold text-destructive tabular-nums">{volumeDemolicao.toFixed(3)} m³</span>
              </div>
            </div>
          )}

          {acao === "construir" && (
            <div className="border rounded-lg p-3 space-y-2.5 bg-card">
              <div className="space-y-1.5">
                <Label className="text-xs">Material</Label>
                <Select value={materialId} onValueChange={setMaterialId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {(materialsQuery.data?.length ?? 0) > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Da Base de Preços</div>
                        {materialOptions.filter((m) => m.fromDb).map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                        ))}
                        <div className="px-2 py-1 mt-1 text-[10px] uppercase tracking-wide text-muted-foreground border-t">Padrão</div>
                      </>
                    )}
                    {materialOptions.filter((m) => !m.fromDb).map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Espessura (cm)</Label>
                <Input type="number" step="0.5" min="0" value={espessura} onChange={(e) => setEspessura(e.target.value)} className="h-9" />
              </div>
            </div>
          )}

          {/* Etiqueta */}
          <div className="space-y-1.5">
            <Label className="text-xs">Etiqueta (opcional)</Label>
            <Input value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder={`Segmento — ${acao}`} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? "A guardar..." : mode === "edit" ? "Atualizar" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
