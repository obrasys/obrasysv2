import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link2, Unlink, Search, Pencil, Trash2, Plus, Sparkles, CopyCheck } from "lucide-react";
import type { PlanMeasurement, PlanMeasurementMapping } from "@/types/plan-measurements";
import { suggestArticlesForMeasurement, measurementSignature } from "@/lib/plan-article-suggestions";

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
  onCreateMapping: (data: {
    measurementId: string;
    artigoBaseId?: string;
    unidadeArtigo?: string;
    fatorDesperdicio?: number;
    coeficiente?: number;
  }) => void;
  onUpdateMapping: (data: {
    id: string;
    artigoBaseId?: string;
    unidadeArtigo?: string;
    fatorDesperdicio?: number;
    coeficiente?: number;
    estado?: "mapeado" | "por_mapear" | "incompativel";
  }) => void;
  onDeleteMapping: (id: string) => void;
  onUpdateMeasurement: (id: string, updates: { valorAjustado?: number; valorFinal?: number; estadoValidacao?: string }) => void;
  isLoading?: boolean;
}

const ESTADO_COLORS: Record<string, string> = {
  mapeado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  por_mapear: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  incompativel: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function PlanMappingTable({
  measurements,
  mappings,
  articles,
  onCreateMapping,
  onUpdateMapping,
  onDeleteMapping,
  onUpdateMeasurement,
}: Props) {
  const [search, setSearch] = useState("");
  const [editDialog, setEditDialog] = useState<{
    measurement: PlanMeasurement;
    mapping?: PlanMeasurementMapping;
  } | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [fatorDesperdicio, setFatorDesperdicio] = useState("1.0");
  const [coeficiente, setCoeficiente] = useState("1.0");
  const [articleSearch, setArticleSearch] = useState("");

  const mappingByMeasurement = useMemo(() => {
    const map = new Map<string, PlanMeasurementMapping>();
    mappings.forEach((m) => map.set(m.measurement_id, m));
    return map;
  }, [mappings]);

  const articleById = useMemo(() => {
    const map = new Map<string, Article>();
    articles.forEach((a) => map.set(a.id, a));
    return map;
  }, [articles]);

  const filteredMeasurements = useMemo(() => {
    if (!search) return measurements;
    const q = search.toLowerCase();
    return measurements.filter(
      (m) =>
        m.etiqueta?.toLowerCase().includes(q) ||
        m.camada?.toLowerCase().includes(q) ||
        m.tipo.toLowerCase().includes(q)
    );
  }, [measurements, search]);

  const filteredArticles = useMemo(() => {
    if (!articleSearch) return articles.slice(0, 50);
    const q = articleSearch.toLowerCase();
    return articles
      .filter((a) => a.descricao.toLowerCase().includes(q) || a.codigo.toLowerCase().includes(q))
      .slice(0, 50);
  }, [articles, articleSearch]);

  const openEditDialog = (measurement: PlanMeasurement) => {
    const mapping = mappingByMeasurement.get(measurement.id);
    setEditDialog({ measurement, mapping });
    setSelectedArticleId(mapping?.artigo_base_id ?? "");
    setFatorDesperdicio(String(mapping?.fator_desperdicio ?? 1.0));
    setCoeficiente(String(mapping?.coeficiente ?? 1.0));
    setArticleSearch("");
  };

  const handleSaveMapping = () => {
    if (!editDialog) return;
    const { measurement, mapping } = editDialog;
    const article = selectedArticleId ? articleById.get(selectedArticleId) : null;

    if (mapping) {
      onUpdateMapping({
        id: mapping.id,
        artigoBaseId: selectedArticleId || undefined,
        unidadeArtigo: article?.unidade,
        fatorDesperdicio: parseFloat(fatorDesperdicio) || 1.0,
        coeficiente: parseFloat(coeficiente) || 1.0,
        estado: selectedArticleId ? "mapeado" : "por_mapear",
      });
    } else {
      onCreateMapping({
        measurementId: measurement.id,
        artigoBaseId: selectedArticleId || undefined,
        unidadeArtigo: article?.unidade,
        fatorDesperdicio: parseFloat(fatorDesperdicio) || 1.0,
        coeficiente: parseFloat(coeficiente) || 1.0,
      });
    }
    setEditDialog(null);
  };

  const calcQuantidadeFinal = (m: PlanMeasurement, mapping?: PlanMeasurementMapping) => {
    const base = m.valor_ajustado ?? m.valor_bruto;
    if (!mapping) return base;
    return base * mapping.coeficiente * mapping.fator_desperdicio;
  };

  const stats = useMemo(() => {
    const total = measurements.length;
    const mapped = measurements.filter((m) => {
      const map = mappingByMeasurement.get(m.id);
      return map && map.estado === "mapeado";
    }).length;
    return { total, mapped, unmapped: total - mapped };
  }, [measurements, mappingByMeasurement]);

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {stats.total} medições
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-xs">
            <Link2 className="w-3 h-3 mr-1" />
            {stats.mapped} mapeadas
          </Badge>
          {stats.unmapped > 0 && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs">
              <Unlink className="w-3 h-3 mr-1" />
              {stats.unmapped} por mapear
            </Badge>
          )}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar medições..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Medição</TableHead>
              <TableHead className="text-right">Bruto</TableHead>
              <TableHead className="text-right">Ajustado</TableHead>
              <TableHead>Artigo Associado</TableHead>
              <TableHead className="text-right">Desp.</TableHead>
              <TableHead className="text-right">Coef.</TableHead>
              <TableHead className="text-right">Qtd Final</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMeasurements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  Sem medições para mapear.
                </TableCell>
              </TableRow>
            ) : (
              filteredMeasurements.map((m) => {
                const mapping = mappingByMeasurement.get(m.id);
                const article = mapping?.artigo_base_id ? articleById.get(mapping.artigo_base_id) : null;
                const qtdFinal = calcQuantidadeFinal(m, mapping);
                const estado = mapping?.estado ?? "por_mapear";

                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.cor || "#3b82f6" }} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="text-sm font-medium">{m.etiqueta || m.tipo}</span>
                        {m.camada && (
                          <span className="text-xs text-muted-foreground ml-1.5">({m.camada})</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {m.valor_bruto.toFixed(2)} {m.unidade}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24 h-7 text-xs text-right inline-block"
                        defaultValue={m.valor_ajustado ?? m.valor_bruto}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val !== (m.valor_ajustado ?? m.valor_bruto)) {
                            onUpdateMeasurement(m.id, { valorAjustado: val, valorFinal: val });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {article ? (
                        <div className="text-xs">
                          <span className="font-medium">{article.codigo}</span>
                          <span className="text-muted-foreground ml-1 line-clamp-1">{article.descricao}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sem artigo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {mapping ? `×${mapping.fator_desperdicio.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {mapping ? `×${mapping.coeficiente.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      {qtdFinal.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${ESTADO_COLORS[estado] ?? ""}`}>
                        {estado === "mapeado" ? "Mapeado" : estado === "incompativel" ? "Incomp." : "Por mapear"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditDialog(m)}>
                          {mapping ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </Button>
                        {mapping && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => onDeleteMapping(mapping.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit/Create Mapping Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editDialog?.mapping ? "Editar Mapeamento" : "Mapear Medição"}
            </DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4 py-2">
              {/* Measurement info */}
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: editDialog.measurement.cor || "#3b82f6" }} />
                  <span className="font-medium text-sm">{editDialog.measurement.etiqueta || editDialog.measurement.tipo}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Valor: {editDialog.measurement.valor_bruto.toFixed(2)} {editDialog.measurement.unidade}
                  {editDialog.measurement.camada && ` · Camada: ${editDialog.measurement.camada}`}
                </p>
              </div>

              {/* Article search & select */}
              <div className="space-y-2">
                <Label className="text-xs">Artigo da Base de Preços</Label>
                <Input
                  placeholder="Pesquisar artigo por código ou descrição..."
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  className="h-8"
                />
                <Select value={selectedArticleId} onValueChange={setSelectedArticleId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar artigo..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="none">Nenhum (por mapear)</SelectItem>
                    {filteredArticles.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="font-mono text-xs mr-1">{a.codigo}</span>
                        <span className="text-xs">{a.descricao.slice(0, 60)}</span>
                        <span className="text-xs text-muted-foreground ml-1">({a.unidade})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Coefficients */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Fator de Desperdício</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={fatorDesperdicio}
                    onChange={(e) => setFatorDesperdicio(e.target.value)}
                    className="h-8"
                  />
                  <p className="text-[10px] text-muted-foreground">Ex: 1.10 = +10% desperdício</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Coeficiente</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={coeficiente}
                    onChange={(e) => setCoeficiente(e.target.value)}
                    className="h-8"
                  />
                  <p className="text-[10px] text-muted-foreground">Multiplicador de conversão</p>
                </div>
              </div>

              {/* Preview */}
              {selectedArticleId && selectedArticleId !== "none" && (
                <div className="bg-muted/50 border rounded-lg p-3 text-xs space-y-1">
                  <p className="font-medium">Resultado:</p>
                  <p>
                    {editDialog.measurement.valor_bruto.toFixed(2)} × {fatorDesperdicio} × {coeficiente} ={" "}
                    <span className="font-bold">
                      {(editDialog.measurement.valor_bruto * parseFloat(fatorDesperdicio || "1") * parseFloat(coeficiente || "1")).toFixed(2)}
                    </span>{" "}
                    {articleById.get(selectedArticleId)?.unidade ?? editDialog.measurement.unidade}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMapping}>
              {editDialog?.mapping ? "Atualizar" : "Mapear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
