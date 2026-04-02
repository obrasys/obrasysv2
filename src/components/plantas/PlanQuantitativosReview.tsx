import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import type { PlanMeasurement, PlanMeasurementMapping } from "@/types/plan-measurements";

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
  onValidateMeasurement: (id: string, estado: "validado" | "rejeitado") => void;
  onUpdateFinal: (id: string, valorFinal: number) => void;
}

interface ConsolidatedRow {
  artigoId: string;
  article: Article;
  items: Array<{
    measurement: PlanMeasurement;
    mapping: PlanMeasurementMapping;
    qtdFinal: number;
  }>;
  totalQtd: number;
  totalValor: number;
}

export function PlanQuantitativosReview({
  measurements,
  mappings,
  articles,
  onValidateMeasurement,
  onUpdateFinal,
}: Props) {
  const articleById = useMemo(() => {
    const map = new Map<string, Article>();
    articles.forEach((a) => map.set(a.id, a));
    return map;
  }, [articles]);

  const measurementById = useMemo(() => {
    const map = new Map<string, PlanMeasurement>();
    measurements.forEach((m) => map.set(m.id, m));
    return map;
  }, [measurements]);

  // Consolidate by article
  const consolidated = useMemo(() => {
    const byArticle = new Map<string, ConsolidatedRow>();

    mappings
      .filter((m) => m.estado === "mapeado" && m.artigo_base_id)
      .forEach((mapping) => {
        const measurement = measurementById.get(mapping.measurement_id);
        const article = articleById.get(mapping.artigo_base_id!);
        if (!measurement || !article) return;

        const qtdFinal = (measurement.valor_ajustado ?? measurement.valor_bruto) * mapping.coeficiente * mapping.fator_desperdicio;

        if (!byArticle.has(article.id)) {
          byArticle.set(article.id, {
            artigoId: article.id,
            article,
            items: [],
            totalQtd: 0,
            totalValor: 0,
          });
        }
        const row = byArticle.get(article.id)!;
        row.items.push({ measurement, mapping, qtdFinal });
        row.totalQtd += qtdFinal;
        row.totalValor += qtdFinal * article.preco_unitario;
      });

    return Array.from(byArticle.values()).sort((a, b) => a.article.codigo.localeCompare(b.article.codigo));
  }, [mappings, measurementById, articleById]);

  const totals = useMemo(
    () => ({
      valor: consolidated.reduce((acc, r) => acc + r.totalValor, 0),
      artigos: consolidated.length,
      medicoes: consolidated.reduce((acc, r) => acc + r.items.length, 0),
    }),
    [consolidated]
  );

  const unmapped = measurements.filter((m) => {
    const mapping = mappings.find((mp) => mp.measurement_id === m.id);
    return !mapping || mapping.estado !== "mapeado";
  });

  const estadoIcon = (estado: string) => {
    switch (estado) {
      case "validado":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "rejeitado":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totals.artigos}</p>
          <p className="text-xs text-muted-foreground">Artigos distintos</p>
        </div>
        <div className="bg-muted rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totals.medicoes}</p>
          <p className="text-xs text-muted-foreground">Medições mapeadas</p>
        </div>
        <div className="bg-muted rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            {totals.valor.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
          </p>
          <p className="text-xs text-muted-foreground">Valor estimado</p>
        </div>
      </div>

      {/* Consolidated table */}
      {consolidated.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Qtd Total</TableHead>
                <TableHead>Un.</TableHead>
                <TableHead className="text-right">P. Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Validação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consolidated.map((row) => (
                <TableRow key={row.artigoId}>
                  <TableCell className="font-mono text-xs">{row.article.codigo}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{row.article.descricao}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {row.items.length} medição(ões):{" "}
                        {row.items.map((i) => i.measurement.etiqueta || i.measurement.tipo).join(", ")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {row.totalQtd.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs">{row.article.unidade}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {row.article.preco_unitario.toFixed(2)} €
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {row.totalValor.toFixed(2)} €
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {row.items.map((i) => (
                        <div key={i.measurement.id} className="flex items-center gap-0.5">
                          {estadoIcon(i.measurement.estado_validacao)}
                        </div>
                      ))}
                      <div className="flex gap-0.5 ml-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          title="Validar todos"
                          onClick={() => row.items.forEach((i) => onValidateMeasurement(i.measurement.id, "validado"))}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Unmapped warning */}
      {unmapped.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {unmapped.length} medição(ões) por mapear
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            {unmapped.map((m) => m.etiqueta || m.tipo).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
