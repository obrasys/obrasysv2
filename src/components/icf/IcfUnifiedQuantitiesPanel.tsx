/**
 * Fase 6 — Painel de quantitativos ICF unificados (PDF + DXF)
 *
 * Mostra parâmetros editáveis pré-fecho (pé-direito, espessura, % desperdício,
 * descontar vãos, bloco, armadura, fundações), recalcula em tempo real e
 * apresenta totais + linhas por parede com flag de revisão.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, AlertTriangle, FileBox } from "lucide-react";
import {
  buildIcfUnifiedQuantities,
  type IcfUnifiedParams,
} from "@/lib/icf-unified-quantities";
import type { IcfPlantAnalysisResult } from "@/hooks/useIcfPlantAnalysis";

interface Props {
  result: IcfPlantAnalysisResult | null;
  params: IcfUnifiedParams;
  onParamsChange: (next: IcfUnifiedParams) => void;
}

export function IcfUnifiedQuantitiesPanel({ result, params, onParamsChange }: Props) {
  const quants = useMemo(
    () => buildIcfUnifiedQuantities(result, params),
    [result, params],
  );

  const set = <K extends keyof IcfUnifiedParams>(k: K, v: IcfUnifiedParams[K]) =>
    onParamsChange({ ...params, [k]: v });

  if (!result) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Quantitativos ICF unificados
          <Badge variant="outline" className="ml-2 text-[10px] uppercase">
            {quants.origem === "dxf" ? "DXF vetorial" : quants.origem === "ai" ? "PDF/IA" : "—"}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ajuste os parâmetros antes de carregar para o orçamento. Os valores são recalculados em tempo real.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Parâmetros */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Pé-direito padrão (m)">
            <Input
              type="number"
              step="0.05"
              min="2"
              max="6"
              value={params.peDireitoPadrao}
              onChange={(e) => set("peDireitoPadrao", Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Espessura núcleo (m)">
            <Input
              type="number"
              step="0.01"
              min="0.1"
              max="0.4"
              value={params.espessuraNucleoPadrao}
              onChange={(e) => set("espessuraNucleoPadrao", Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="% desperdício">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="0.5"
              value={params.percentDesperdicio}
              onChange={(e) => set("percentDesperdicio", Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Armadura (kg/m³)">
            <Input
              type="number"
              step="5"
              min="0"
              max="200"
              value={params.kgArmaduraPorM3}
              onChange={(e) => set("kgArmaduraPorM3", Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Bloco (comp. mm)">
            <Input
              type="number"
              step="50"
              value={params.bloco.comprimentoMm}
              onChange={(e) =>
                set("bloco", { ...params.bloco, comprimentoMm: Number(e.target.value) || 0 })
              }
            />
          </Field>
          <Field label="Bloco (altura mm)">
            <Input
              type="number"
              step="50"
              value={params.bloco.alturaMm}
              onChange={(e) =>
                set("bloco", { ...params.bloco, alturaMm: Number(e.target.value) || 0 })
              }
            />
          </Field>
          <div className="flex items-center justify-between border rounded-md px-3">
            <Label htmlFor="desc-vaos" className="text-xs">Descontar vãos</Label>
            <Switch
              id="desc-vaos"
              checked={params.descontarVaos}
              onCheckedChange={(v) => set("descontarVaos", v)}
            />
          </div>
          <div className="flex items-center justify-between border rounded-md px-3">
            <Label htmlFor="inc-fund" className="text-xs">Incluir fundações</Label>
            <Switch
              id="inc-fund"
              checked={params.incluirFundacoes}
              onCheckedChange={(v) => set("incluirFundacoes", v)}
            />
          </div>
        </div>

        {/* Totais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Kpi label="ml ext." value={`${quants.totais.ml_ext} m`} />
          <Kpi label="ml int." value={`${quants.totais.ml_int} m`} />
          <Kpi label="Área líquida" value={`${quants.totais.area_liquida_m2} m²`} />
          <Kpi
            label="Blocos (c/ desperdício)"
            value={`${quants.totais.blocos_com_desperdicio}`}
            sub={`base ${quants.totais.blocos_total}`}
          />
          <Kpi label="Betão paredes" value={`${quants.totais.volume_betao_paredes_m3} m³`} />
          <Kpi label="Betão fundações" value={`${quants.totais.volume_betao_fundacoes_m3} m³`} />
          <Kpi label="Betão lajes" value={`${quants.totais.volume_betao_lajes_m3} m³`} />
          <Kpi
            label="Armadura est."
            value={`${quants.totais.armadura_kg} kg`}
            sub={`${params.kgArmaduraPorM3} kg/m³`}
          />
        </div>

        {/* Avisos */}
        {(quants.avisos.length > 0 || quants.totais.paredes_revisao > 0) && (
          <div className="rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              {quants.totais.paredes_revisao} de {quants.totais.paredes_total} parede(s) a rever
              {quants.totais.confianca_media !== null && (
                <span className="ml-1 opacity-80">
                  · confiança média {Math.round(quants.totais.confianca_media * 100)}%
                </span>
              )}
            </div>
            <ul className="list-disc pl-5 text-amber-700/90 dark:text-amber-200/80 space-y-0.5">
              {quants.avisos.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Linhas por parede */}
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referência</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Comp. (m)</TableHead>
                <TableHead className="text-right">Alt. (m)</TableHead>
                <TableHead className="text-right">Esp. (m)</TableHead>
                <TableHead className="text-right">A. líq. (m²)</TableHead>
                <TableHead className="text-right">Blocos</TableHead>
                <TableHead className="text-right">Betão (m³)</TableHead>
                <TableHead>Confiança</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quants.linhas.map((l) => (
                <TableRow key={l.referencia} className={l.requires_review ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}>
                  <TableCell className="font-medium">{l.referencia}</TableCell>
                  <TableCell>
                    <Badge variant={l.tipo === "exterior" ? "default" : l.tipo === "interior" ? "secondary" : "outline"}>
                      {l.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{l.comprimento_m}</TableCell>
                  <TableCell className="text-right">{l.altura_m}</TableCell>
                  <TableCell className="text-right">{l.espessura_m}</TableCell>
                  <TableCell className="text-right">{l.area_liquida_m2}</TableCell>
                  <TableCell className="text-right">{l.blocos_estimados}</TableCell>
                  <TableCell className="text-right">{l.volume_betao_m3}</TableCell>
                  <TableCell>
                    {l.confianca === null ? "—" : `${Math.round(l.confianca * 100)}%`}
                  </TableCell>
                  <TableCell>
                    {l.requires_review ? (
                      <Badge variant="destructive" className="text-[10px]">Rever</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {quants.linhas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                    <FileBox className="h-5 w-5 mx-auto mb-1 opacity-50" />
                    Sem paredes consolidadas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border rounded-md p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
