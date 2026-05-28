import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ruler, DoorOpen, Columns3, Search, Download, MapPin, Table2, Send, AlertTriangle, Trees } from "lucide-react";
import { PlanAxiaBudgetSendDialog } from "./PlanAxiaBudgetSendDialog";
import { ConfidenceBadge } from "./ConfidenceBadge";
import type { PlanAnalysisResult, AxiaBBox } from "./PlanAIAnalysis";

export type AxiaDimension = PlanAnalysisResult["dimensions"][number];
export type AxiaRoom = PlanAnalysisResult["rooms"][number];
export type AxiaElement = PlanAnalysisResult["elements"][number];
export type AxiaWall = NonNullable<PlanAnalysisResult["walls"]>[number];
export type AxiaExterior = NonNullable<PlanAnalysisResult["exterior_elements"]>[number];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimensions: AxiaDimension[];
  rooms: AxiaRoom[];
  elements: AxiaElement[];
  walls?: AxiaWall[];
  exteriorElements?: AxiaExterior[];
  sheetClassification?: PlanAnalysisResult["sheet_classification"];
  readingQuality?: PlanAnalysisResult["reading_quality"];
  limitations?: string[];
  validationQuestions?: string[];
  onHighlightPosition?: (x: number, y: number) => void;
  pageLabel?: string;
  resultsByPage?: Record<number, PlanAnalysisResult>;
  obraId?: string;
  planImportId?: string;
  planName?: string;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((v) => {
      const s = String(v ?? "");
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function scoreToLevel(score: number | undefined) {
  if (typeof score !== "number") return "provavel" as const;
  if (score >= 0.85) return "confirmado" as const;
  if (score >= 0.55) return "provavel" as const;
  return "precisa_validar" as const;
}

function ReviewBadge({ required }: { required?: boolean }) {
  if (!required) return <span className="text-muted-foreground text-xs">-</span>;
  return (
    <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-700 border-amber-200 text-[10px]">
      <AlertTriangle className="w-3 h-3" /> Validar
    </Badge>
  );
}

function bboxCenter(bbox?: AxiaBBox): { x: number; y: number } | null {
  if (!bbox) return null;
  return { x: (bbox.x_min + bbox.x_max) / 2, y: (bbox.y_min + bbox.y_max) / 2 };
}

const SHEET_TYPE_LABEL: Record<string, string> = {
  planta_piso: "Planta de Piso",
  implantacao: "Implantação",
  corte: "Corte",
  alcado: "Alçado",
  detalhe: "Detalhe",
  legenda: "Legenda",
  outro: "Outro",
};

export function PlanAxiaResultsTable({
  open,
  onOpenChange,
  dimensions,
  rooms,
  elements,
  walls = [],
  exteriorElements = [],
  sheetClassification,
  readingQuality,
  limitations,
  validationQuestions,
  onHighlightPosition,
  pageLabel,
  resultsByPage,
  obraId,
  planImportId,
  planName,
}: Props) {
  const [search, setSearch] = useState("");
  const [showSendDialog, setShowSendDialog] = useState(false);

  const analyzedPagesCount = resultsByPage ? Object.keys(resultsByPage).length : 0;
  const canSendBudget = !!obraId && !!planImportId && analyzedPagesCount > 0;

  const q = search.trim().toLowerCase();

  const filteredDims = useMemo(
    () => dimensions.filter((d) => !q || d.label?.toLowerCase().includes(q) || String(d.value).includes(q) || (d.raw_text ?? "").toLowerCase().includes(q)),
    [dimensions, q]
  );
  const filteredRooms = useMemo(
    () => rooms.filter((r) => !q || r.name.toLowerCase().includes(q) || (r.tipo_normalizado ?? "").includes(q)),
    [rooms, q]
  );
  const filteredElements = useMemo(
    () => elements.filter((e) => !q || e.label.toLowerCase().includes(q) || e.type.toLowerCase().includes(q)),
    [elements, q]
  );
  const filteredWalls = useMemo(
    () => walls.filter((w) => !q || w.tipo.toLowerCase().includes(q) || (w.compartimento_associado ?? "").toLowerCase().includes(q)),
    [walls, q]
  );
  const filteredExterior = useMemo(
    () => exteriorElements.filter((e) => !q || e.tipo.toLowerCase().includes(q) || (e.notes ?? "").toLowerCase().includes(q)),
    [exteriorElements, q]
  );

  const handleGoTo = (x: number, y: number) => {
    onHighlightPosition?.(x, y);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Table2 className="w-5 h-5 text-primary" />
            Resultados da Análise Visual Axia™
            {pageLabel && <Badge variant="outline" className="ml-1">{pageLabel}</Badge>}
            {sheetClassification?.type && (
              <Badge variant="default" className="ml-1 text-[10px]">
                {SHEET_TYPE_LABEL[sheetClassification.type] ?? sheetClassification.type}
              </Badge>
            )}
            {sheetClassification?.escala && (
              <Badge variant="outline" className="text-[10px]">Esc. {sheetClassification.escala}</Badge>
            )}
            {readingQuality?.human_intervention_required && (
              <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-700 border-amber-200 text-[10px]">
                <AlertTriangle className="w-3 h-3" /> Validação humana
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Vista detalhada de todos os elementos identificados pela Axia. Itens com badge âmbar precisam de validação humana antes de orçamentar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por etiqueta, tipo, valor ou texto original..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {canSendBudget && (
            <Button size="sm" onClick={() => setShowSendDialog(true)} className="shrink-0">
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Enviar p/ Quantitativos
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {analyzedPagesCount} folha(s)
              </Badge>
            </Button>
          )}
        </div>

        <Tabs defaultValue="dimensions" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="dimensions" className="gap-1.5">
              <Ruler className="w-3.5 h-3.5" /> Cotas
              <Badge variant="secondary" className="ml-1">{filteredDims.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rooms" className="gap-1.5">
              <DoorOpen className="w-3.5 h-3.5" /> Compartimentos
              <Badge variant="secondary" className="ml-1">{filteredRooms.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="elements" className="gap-1.5">
              <Columns3 className="w-3.5 h-3.5" /> Elementos
              <Badge variant="secondary" className="ml-1">{filteredElements.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="walls" className="gap-1.5">
              <Columns3 className="w-3.5 h-3.5" /> Paredes
              <Badge variant="secondary" className="ml-1">{filteredWalls.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="exterior" className="gap-1.5">
              <Trees className="w-3.5 h-3.5" /> Exterior
              <Badge variant="secondary" className="ml-1">{filteredExterior.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Cotas */}
          <TabsContent value="dimensions" className="mt-3">
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filteredDims.length === 0}
                onClick={() =>
                  downloadCsv("axia-cotas.csv", [
                    ["Valor", "Unidade", "Texto original", "Etiqueta", "Confiança", "Validar?", "Posição X", "Posição Y"],
                    ...filteredDims.map((d) => [
                      d.value, d.unit, d.raw_text ?? "", d.label,
                      d.confidence.toFixed(2),
                      d.review_required ? "sim" : "",
                      d.position_x, d.position_y,
                    ]),
                  ])
                }
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar CSV
              </Button>
            </div>
            <ScrollArea className="h-[55vh] rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Valor</TableHead>
                    <TableHead>Unid.</TableHead>
                    <TableHead>Texto original</TableHead>
                    <TableHead>Etiqueta</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Validar?</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDims.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sem cotas.</TableCell></TableRow>
                  ) : filteredDims.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.value}</TableCell>
                      <TableCell>{d.unit}</TableCell>
                      <TableCell className="text-xs">
                        {d.raw_text ?? <span className="text-muted-foreground">-</span>}
                        {d.valor_nao_legivel && (
                          <Badge variant="outline" className="ml-1 bg-red-500/10 text-red-700 border-red-200 text-[9px]">
                            ilegível
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate">{d.label}</TableCell>
                      <TableCell><ConfidenceBadge level={scoreToLevel(d.confidence)} /></TableCell>
                      <TableCell><ReviewBadge required={d.review_required || d.valor_nao_legivel} /></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleGoTo(d.position_x, d.position_y)}>
                          <MapPin className="w-3.5 h-3.5 mr-1" /> Ir para
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Compartimentos */}
          <TabsContent value="rooms" className="mt-3">
            {(() => {
              const pendingCount = filteredRooms.filter((r) => r.review_required).length;
              return pendingCount > 0 ? (
                <div className="mb-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div>
                    <strong>{pendingCount}</strong> compartimento(s) com valores estimados pela Axia (área/perímetro inferidos por tipo).
                    Reveja e ajuste antes de enviar para orçamento - as linhas a amarelo precisam de validação.
                  </div>
                </div>
              ) : null;
            })()}
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filteredRooms.length === 0}
                onClick={() =>
                  downloadCsv("axia-compartimentos.csv", [
                    ["Nome", "Tipo", "Área estimada (m²)", "Confiança", "Validar?", "Centro X", "Centro Y"],
                    ...filteredRooms.map((r) => [
                      r.name, r.tipo_normalizado ?? "", r.estimated_area ?? "",
                      r.confidence.toFixed(2),
                      r.review_required ? "sim" : "",
                      r.center_x, r.center_y,
                    ]),
                  ])
                }
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar CSV
              </Button>
            </div>
            <ScrollArea className="h-[55vh] rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Área estimada</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Validar?</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRooms.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem compartimentos.</TableCell></TableRow>
                  ) : filteredRooms.map((r, i) => (
                    <TableRow
                      key={i}
                      className={r.review_required ? "bg-amber-50/60 dark:bg-amber-900/10 border-l-2 border-l-amber-400" : ""}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {r.review_required && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-label="Requer validação" />
                          )}
                          {r.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs capitalize">{r.tipo_normalizado?.replace(/_/g, " ") ?? "-"}</TableCell>
                      <TableCell>
                        {r.estimated_area ? `${r.estimated_area.toFixed(2)} m²` : "-"}
                        {r.area_legivel === false && (
                          <Badge variant="outline" className="ml-1 text-[9px] border-amber-400 text-amber-700 dark:text-amber-300">
                            estimada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell><ConfidenceBadge level={scoreToLevel(r.confidence)} /></TableCell>
                      <TableCell><ReviewBadge required={r.review_required} /></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleGoTo(r.center_x, r.center_y)}>
                          <MapPin className="w-3.5 h-3.5 mr-1" /> Ir para
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Elementos */}
          <TabsContent value="elements" className="mt-3">
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filteredElements.length === 0}
                onClick={() =>
                  downloadCsv("axia-elementos.csv", [
                    ["Tipo", "Etiqueta", "Largura (cm)", "Altura (cm)", "Dim. Lida?", "Quantidade", "Confiança", "Validar?", "Posição X", "Posição Y"],
                    ...filteredElements.map((e: any) => [
                      e.type, e.label,
                      e.largura_cm ?? "",
                      e.altura_cm ?? "",
                      e.dimensao_legivel ? "sim" : (e.largura_cm ? "inferida" : ""),
                      e.count ?? 1,
                      (e.confidence_score ?? 0).toFixed(2),
                      e.review_required ? "sim" : "",
                      e.position_x, e.position_y,
                    ]),
                  ])
                }
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar CSV
              </Button>
            </div>
            <ScrollArea className="h-[55vh] rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Etiqueta</TableHead>
                    <TableHead>Dimensão</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Validar?</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredElements.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sem elementos.</TableCell></TableRow>
                  ) : filteredElements.map((e: any, i) => {
                    const dim = e.largura_cm
                      ? `${e.largura_cm}×${e.altura_cm ?? "-"}`
                      : "-";
                    const dimSrc = e.dimensao_legivel ? "lida" : (e.largura_cm ? "inferida" : "");
                    return (
                      <TableRow key={i}>
                        <TableCell className="capitalize text-xs">{(e.type ?? "-").replace(/_/g, " ")}</TableCell>
                        <TableCell className="font-medium">{e.label}</TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {dim}
                          {dimSrc && (
                            <span className="ml-1 text-[10px] text-muted-foreground">({dimSrc})</span>
                          )}
                        </TableCell>
                        <TableCell>{e.count ?? 1}</TableCell>
                        <TableCell><ConfidenceBadge level={scoreToLevel(e.confidence_score)} /></TableCell>
                        <TableCell><ReviewBadge required={e.review_required} /></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => handleGoTo(e.position_x, e.position_y)}>
                            <MapPin className="w-3.5 h-3.5 mr-1" /> Ir para
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Paredes */}
          <TabsContent value="walls" className="mt-3">
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filteredWalls.length === 0}
                onClick={() =>
                  downloadCsv("axia-paredes.csv", [
                    ["Tipo", "Orientação", "Compartimento", "Confiança", "Validar?", "Notas"],
                    ...filteredWalls.map((w) => [
                      w.tipo, w.orientacao, w.compartimento_associado ?? "",
                      w.confidence_score.toFixed(2),
                      w.review_required ? "sim" : "",
                      w.notes ?? "",
                    ]),
                  ])
                }
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar CSV
              </Button>
            </div>
            <ScrollArea className="h-[55vh] rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Orientação</TableHead>
                    <TableHead>Compartimento</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Validar?</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWalls.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem paredes identificadas.</TableCell></TableRow>
                  ) : filteredWalls.map((w, i) => {
                    const c = bboxCenter(w.bbox);
                    return (
                      <TableRow key={i}>
                        <TableCell className="capitalize text-xs">{(w.tipo ?? "-").replace(/_/g, " ")}</TableCell>
                        <TableCell className="capitalize text-xs">{w.orientacao}</TableCell>
                        <TableCell className="text-xs">{w.compartimento_associado ?? "-"}</TableCell>
                        <TableCell><ConfidenceBadge level={scoreToLevel(w.confidence_score)} /></TableCell>
                        <TableCell><ReviewBadge required={w.review_required} /></TableCell>
                        <TableCell className="text-right">
                          {c ? (
                            <Button size="sm" variant="ghost" onClick={() => handleGoTo(c.x, c.y)}>
                              <MapPin className="w-3.5 h-3.5 mr-1" /> Ir para
                            </Button>
                          ) : <span className="text-xs text-muted-foreground">-</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Exterior */}
          <TabsContent value="exterior" className="mt-3">
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filteredExterior.length === 0}
                onClick={() =>
                  downloadCsv("axia-exterior.csv", [
                    ["Tipo", "Confiança", "Notas"],
                    ...filteredExterior.map((e) => [e.tipo, e.confidence_score.toFixed(2), e.notes ?? ""]),
                  ])
                }
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar CSV
              </Button>
            </div>
            <ScrollArea className="h-[55vh] rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExterior.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sem elementos exteriores.</TableCell></TableRow>
                  ) : filteredExterior.map((e, i) => {
                    const c = bboxCenter(e.bbox);
                    return (
                      <TableRow key={i}>
                        <TableCell className="capitalize text-xs">{(e.tipo ?? "-").replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-xs">{e.notes ?? "-"}</TableCell>
                        <TableCell><ConfidenceBadge level={scoreToLevel(e.confidence_score)} /></TableCell>
                        <TableCell className="text-right">
                          {c ? (
                            <Button size="sm" variant="ghost" onClick={() => handleGoTo(c.x, c.y)}>
                              <MapPin className="w-3.5 h-3.5 mr-1" /> Ir para
                            </Button>
                          ) : <span className="text-xs text-muted-foreground">-</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {(limitations?.length || validationQuestions?.length) ? (
          <div className="mt-2 rounded-md border bg-amber-500/5 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" /> Validações da Axia
            </div>
            {limitations && limitations.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Limitações</p>
                <ul className="text-[11px] list-disc pl-4 space-y-0.5 text-muted-foreground">
                  {limitations.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </div>
            )}
            {validationQuestions && validationQuestions.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Perguntas a confirmar</p>
                <ul className="text-[11px] list-disc pl-4 space-y-0.5 text-muted-foreground">
                  {validationQuestions.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>

      {canSendBudget && resultsByPage && obraId && planImportId && (
        <PlanAxiaBudgetSendDialog
          open={showSendDialog}
          onOpenChange={setShowSendDialog}
          resultsByPage={resultsByPage}
          obraId={obraId}
          planImportId={planImportId}
          planName={planName}
        />
      )}
    </Dialog>
  );
}
