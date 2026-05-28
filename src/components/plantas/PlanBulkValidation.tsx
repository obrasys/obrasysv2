import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, ChevronsUp } from "lucide-react";
import type { PlanMeasurement } from "@/types/plan-measurements";

interface Props {
  measurements: PlanMeasurement[];
  onBulkValidate: (ids: string[], estado: "validado" | "rejeitado" | "pendente") => void;
}

export function PlanBulkValidation({ measurements, onBulkValidate }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const stats = useMemo(() => {
    let pendente = 0, validado = 0, rejeitado = 0;
    measurements.forEach((m) => {
      if (m.estado_validacao === "validado") validado++;
      else if (m.estado_validacao === "rejeitado") rejeitado++;
      else pendente++;
    });
    return { pendente, validado, rejeitado, total: measurements.length };
  }, [measurements]);

  const toggleAll = () => {
    if (selected.size === measurements.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(measurements.map((m) => m.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulk = (estado: "validado" | "rejeitado" | "pendente") => {
    if (selected.size === 0) return;
    onBulkValidate(Array.from(selected), estado);
    setSelected(new Set());
  };

  const estadoIcon = (estado: string) => {
    switch (estado) {
      case "validado":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case "rejeitado":
        return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const estadoLabel = (estado: string) => {
    switch (estado) {
      case "validado": return "Validado";
      case "rejeitado": return "Rejeitado";
      default: return "Pendente";
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="gap-1">
          <Clock className="w-3 h-3 text-amber-500" />
          {stats.pendente} pendentes
        </Badge>
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          {stats.validado} validadas
        </Badge>
        <Badge variant="outline" className="gap-1">
          <XCircle className="w-3 h-3 text-destructive" />
          {stats.rejeitado} rejeitadas
        </Badge>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
          <span className="text-sm font-medium">{selected.size} selecionada(s)</span>
          <div className="flex gap-1.5 ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950"
              onClick={() => handleBulk("validado")}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Validar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => handleBulk("rejeitado")}
            >
              <XCircle className="w-3.5 h-3.5" />
              Rejeitar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => handleBulk("pendente")}
            >
              <ChevronsUp className="w-3.5 h-3.5" />
              Repor Pendente
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.size === measurements.length && measurements.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="w-8"></TableHead>
              <TableHead>Medição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Camada</TableHead>
              <TableHead className="text-right">Valor Bruto</TableHead>
              <TableHead className="text-right">Valor Ajustado</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {measurements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Sem medições para validar.
                </TableCell>
              </TableRow>
            ) : (
              measurements.map((m) => (
                <TableRow key={m.id} className={selected.has(m.id) ? "bg-primary/5" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(m.id)}
                      onCheckedChange={() => toggleOne(m.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.cor || "#3b82f6" }} />
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {m.etiqueta || m.tipo}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {m.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.camada || "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {m.valor_bruto.toFixed(2)} {m.unidade}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {(m.valor_ajustado ?? m.valor_bruto).toFixed(2)} {m.unidade}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {estadoIcon(m.estado_validacao)}
                      <span className="text-xs">{estadoLabel(m.estado_validacao)}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
