import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import { useFoundationSuggestion, type FoundationInputs, type FoundationItem } from "@/hooks/useFoundationSuggestion";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planImportId: string;
  obraId: string;
  areaImplantacao?: number;
  perimetroExterior?: number;
}

const DEFAULT_INPUTS: FoundationInputs = {
  numero_pisos: 2,
  tem_cave: false,
  tem_garagem: false,
  icf_integral: true,
  muros_contencao: false,
  grandes_vaos: false,
  altura_pisos_m: 2.7,
  tipo_laje_terrea: "laje_massame",
  desniveis_terreno: false,
  tem_estudo_geotecnico: false,
};

export function FoundationSuggestionWizard({
  open,
  onOpenChange,
  planImportId,
  obraId,
  areaImplantacao,
  perimetroExterior,
}: Props) {
  const { generate } = useFoundationSuggestion(planImportId, obraId);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inputs, setInputs] = useState<FoundationInputs>(DEFAULT_INPUTS);
  const [result, setResult] = useState<{ items: FoundationItem[]; summary?: string; missing_data?: string[]; overall_confidence?: number } | null>(null);

  const reset = () => { setStep(1); setInputs(DEFAULT_INPUTS); setResult(null); };

  const handleGenerate = async () => {
    const res = await generate.mutateAsync({
      inputs,
      area_implantacao_m2: areaImplantacao,
      perimetro_exterior_m: perimetroExterior,
    });
    setResult({ items: res.result?.items ?? [], summary: res.result?.summary, missing_data: res.result?.missing_data, overall_confidence: res.result?.overall_confidence });
    setStep(3);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Sugestão preliminar de Fundação ICF
          </DialogTitle>
          <DialogDescription className="text-xs">
            Passo {step} de 3 — sugestão gerada pela Axia. Não substitui projecto de estabilidade.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle className="text-xs">Aviso técnico</AlertTitle>
              <AlertDescription className="text-xs">
                Não foram encontradas folhas de estrutura/fundações neste ficheiro. A Axia pode gerar
                uma sugestão preliminar de fundação ICF com base na arquitetura, mas esta sugestão
                <strong> não substitui o projeto de estabilidade</strong> e deve ser validada por técnico responsável.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Número de pisos</Label>
                <Input
                  type="number" min={1} max={10}
                  value={inputs.numero_pisos}
                  onChange={(e) => setInputs((p) => ({ ...p, numero_pisos: Number(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Altura aproximada por piso (m)</Label>
                <Input
                  type="number" step="0.1" min={2} max={6}
                  value={inputs.altura_pisos_m ?? 2.7}
                  onChange={(e) => setInputs((p) => ({ ...p, altura_pisos_m: Number(e.target.value) || 2.7 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de terreno (opcional)</Label>
                <Input
                  placeholder="Ex: arenoso, rochoso..."
                  value={inputs.tipo_terreno ?? ""}
                  onChange={(e) => setInputs((p) => ({ ...p, tipo_terreno: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Localização (opcional)</Label>
                <Input
                  value={inputs.localizacao ?? ""}
                  onChange={(e) => setInputs((p) => ({ ...p, localizacao: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Tipo de laje térrea pretendida</Label>
                <Select
                  value={inputs.tipo_laje_terrea ?? "laje_massame"}
                  onValueChange={(v) => setInputs((p) => ({ ...p, tipo_laje_terrea: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laje_terrea_icf">Laje térrea ICF</SelectItem>
                    <SelectItem value="laje_massame">Laje sobre massame</SelectItem>
                    <SelectItem value="laje_aligeirada">Laje aligeirada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {([
                ["tem_cave", "Existe cave?"],
                ["tem_garagem", "Existe garagem?"],
                ["icf_integral", "Construção integralmente em ICF?"],
                ["muros_contencao", "Existem muros de contenção?"],
                ["grandes_vaos", "Existem grandes vãos?"],
                ["desniveis_terreno", "Desníveis relevantes no terreno?"],
                ["tem_estudo_geotecnico", "Existe estudo geotécnico?"],
              ] as Array<[keyof FoundationInputs, string]>).map(([k, label]) => (
                <div key={k} className="flex items-center justify-between border rounded-md p-2.5">
                  <Label className="text-xs">{label}</Label>
                  <Switch
                    checked={!!inputs[k]}
                    onCheckedChange={(v) => setInputs((p) => ({ ...p, [k]: v }) as FoundationInputs)}
                  />
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button onClick={() => setStep(2)}>Continuar</Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Resumo</h3>
            <div className="text-xs space-y-1 border rounded-md p-3 bg-muted/30">
              <p>Nº pisos: <strong>{inputs.numero_pisos}</strong> · altura ~{inputs.altura_pisos_m}m</p>
              <p>Cave: {inputs.tem_cave ? "sim" : "não"} · Garagem: {inputs.tem_garagem ? "sim" : "não"}</p>
              <p>ICF integral: {inputs.icf_integral ? "sim" : "não"} · Muros contenção: {inputs.muros_contencao ? "sim" : "não"} · Grandes vãos: {inputs.grandes_vaos ? "sim" : "não"}</p>
              <p>Terreno: {inputs.tipo_terreno || "n/d"} · Localização: {inputs.localizacao || "n/d"}</p>
              <p>Área implantação (R/C): {areaImplantacao ? `${areaImplantacao.toFixed(1)} m²` : "n/d"} · Perímetro: {perimetroExterior ? `${perimetroExterior.toFixed(1)} m` : "n/d"}</p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={handleGenerate} disabled={generate.isPending}>
                {generate.isPending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />A gerar…</> : <>Gerar sugestão</>}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && result && (
          <div className="space-y-3">
            <Alert>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <AlertTitle className="text-xs">
                Sugestão preliminar gerada · confiança {Math.round((result.overall_confidence ?? 0) * 100)}%
              </AlertTitle>
              <AlertDescription className="text-xs">
                {result.summary ?? "Itens preliminares prontos para revisão."}
              </AlertDescription>
            </Alert>

            {result.missing_data && result.missing_data.length > 0 && (
              <div className="text-xs text-amber-700 border border-amber-200 rounded-md p-2">
                <strong>Dados em falta:</strong> {result.missing_data.join(", ")}
              </div>
            )}

            <div className="border rounded-md max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left p-2">Item</th>
                    <th className="text-right p-2">Quantidade</th>
                    <th className="text-left p-2">Un.</th>
                    <th className="text-right p-2">Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((it, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">
                        <p className="font-medium">{it.descricao}</p>
                        {it.observacoes && <p className="text-[10px] text-muted-foreground">{it.observacoes}</p>}
                      </td>
                      <td className="p-2 text-right tabular-nums">{Number(it.quantidade).toFixed(2)}</td>
                      <td className="p-2">{it.unidade}</td>
                      <td className="p-2 text-right">{Math.round((it.confidence ?? 0) * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Alert variant="default" className="border-amber-300 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <AlertDescription className="text-xs text-amber-900">
                <Badge variant="outline" className="mr-1 text-[10px]">Preliminar</Badge>
                Sugestão gerada a partir da planta de arquitetura. Requer validação por projeto de estabilidade.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
