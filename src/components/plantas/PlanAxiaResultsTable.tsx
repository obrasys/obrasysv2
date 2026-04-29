import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ruler, DoorOpen, Columns3, Search, Download, MapPin, Table2, Send } from "lucide-react";
import { PlanAxiaBudgetSendDialog } from "./PlanAxiaBudgetSendDialog";
import type { PlanAnalysisResult } from "./PlanAIAnalysis";

export interface AxiaDimension {
  value: number;
  unit: string;
  label: string;
  position_x: number;
  position_y: number;
  confidence: number;
}
export interface AxiaRoom {
  name: string;
  estimated_area?: number;
  center_x: number;
  center_y: number;
  confidence: number;
}
export interface AxiaElement {
  type: string;
  label: string;
  position_x: number;
  position_y: number;
  count?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimensions: AxiaDimension[];
  rooms: AxiaRoom[];
  elements: AxiaElement[];
  onHighlightPosition?: (x: number, y: number) => void;
  pageLabel?: string;
  /** Optional: enables "Enviar para orçamento" sending all analyzed pages, one chapter per folha. */
  resultsByPage?: Record<number, PlanAnalysisResult>;
  obraId?: string;
  planName?: string;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  // UTF-8 BOM + ';' separator (PT-standard for Excel)
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

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.8) return <Badge variant="default">Alta</Badge>;
  if (confidence >= 0.5) return <Badge variant="secondary">Média</Badge>;
  return <Badge variant="outline">Baixa</Badge>;
}

export function PlanAxiaResultsTable({
  open,
  onOpenChange,
  dimensions,
  rooms,
  elements,
  onHighlightPosition,
  pageLabel,
  resultsByPage,
  obraId,
  planName,
}: Props) {
  const [search, setSearch] = useState("");
  const [showSendDialog, setShowSendDialog] = useState(false);

  const analyzedPagesCount = resultsByPage ? Object.keys(resultsByPage).length : 0;
  const canSendBudget = !!obraId && analyzedPagesCount > 0;

  const q = search.trim().toLowerCase();

  const filteredDims = useMemo(
    () => dimensions.filter((d) => !q || d.label?.toLowerCase().includes(q) || String(d.value).includes(q)),
    [dimensions, q]
  );
  const filteredRooms = useMemo(
    () => rooms.filter((r) => !q || r.name.toLowerCase().includes(q)),
    [rooms, q]
  );
  const filteredElements = useMemo(
    () => elements.filter((e) => !q || e.label.toLowerCase().includes(q) || e.type.toLowerCase().includes(q)),
    [elements, q]
  );

  const handleGoTo = (x: number, y: number) => {
    onHighlightPosition?.(x, y);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table2 className="w-5 h-5 text-primary" />
            Resultados da Análise Visual Axia™
            {pageLabel && <Badge variant="outline" className="ml-2">{pageLabel}</Badge>}
          </DialogTitle>
          <DialogDescription>
            Vista detalhada de todos os elementos identificados pela Axia. Clique em "Ir para" para localizar no canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por etiqueta, tipo ou valor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs defaultValue="dimensions" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
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
                    ["Valor", "Unidade", "Etiqueta", "Confiança", "Posição X", "Posição Y"],
                    ...filteredDims.map((d) => [d.value, d.unit, d.label, d.confidence.toFixed(2), d.position_x, d.position_y]),
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
                    <TableHead>Unidade</TableHead>
                    <TableHead>Etiqueta</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Posição</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDims.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem cotas.</TableCell></TableRow>
                  ) : filteredDims.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.value}</TableCell>
                      <TableCell>{d.unit}</TableCell>
                      <TableCell className="max-w-[280px] truncate">{d.label}</TableCell>
                      <TableCell><ConfidenceBadge confidence={d.confidence} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        ({Math.round(d.position_x)}, {Math.round(d.position_y)})
                      </TableCell>
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
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filteredRooms.length === 0}
                onClick={() =>
                  downloadCsv("axia-compartimentos.csv", [
                    ["Nome", "Área estimada (m²)", "Confiança", "Centro X", "Centro Y"],
                    ...filteredRooms.map((r) => [r.name, r.estimated_area ?? "", r.confidence.toFixed(2), r.center_x, r.center_y]),
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
                    <TableHead>Área estimada</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Centro</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRooms.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sem compartimentos.</TableCell></TableRow>
                  ) : filteredRooms.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.estimated_area ? `${r.estimated_area.toFixed(2)} m²` : "—"}</TableCell>
                      <TableCell><ConfidenceBadge confidence={r.confidence} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        ({Math.round(r.center_x)}, {Math.round(r.center_y)})
                      </TableCell>
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
                    ["Tipo", "Etiqueta", "Quantidade", "Posição X", "Posição Y"],
                    ...filteredElements.map((e) => [e.type, e.label, e.count ?? 1, e.position_x, e.position_y]),
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
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Posição</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredElements.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sem elementos.</TableCell></TableRow>
                  ) : filteredElements.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="capitalize">{e.type}</TableCell>
                      <TableCell className="font-medium">{e.label}</TableCell>
                      <TableCell>{e.count ?? 1}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        ({Math.round(e.position_x)}, {Math.round(e.position_y)})
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleGoTo(e.position_x, e.position_y)}>
                          <MapPin className="w-3.5 h-3.5 mr-1" /> Ir para
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
