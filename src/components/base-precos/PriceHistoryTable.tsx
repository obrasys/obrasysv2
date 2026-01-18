import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PriceStatusBadge } from "./PriceStatusBadge";
import type { MaterialPriceRaw } from "@/types/base-precos";

interface PriceHistoryTableProps {
  prices: MaterialPriceRaw[];
  showMaterial?: boolean;
}

export function PriceHistoryTable({
  prices,
  showMaterial = true,
}: PriceHistoryTableProps) {
  if (prices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum preço registado.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {showMaterial && <TableHead>Material</TableHead>}
            <TableHead>Preço</TableHead>
            <TableHead>Região</TableHead>
            <TableHead>Fonte</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data Ref.</TableHead>
            <TableHead>Inserido em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prices.map((price) => (
            <TableRow key={price.id}>
              {showMaterial && (
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {price.material?.codigo}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {price.material?.nome}
                    </span>
                  </div>
                </TableCell>
              )}
              <TableCell>
                <span className="font-medium">
                  €{price.preco.toFixed(2)}
                </span>
                <span className="text-muted-foreground ml-1">
                  /{price.unidade_original}
                </span>
              </TableCell>
              <TableCell>{price.region?.nome}</TableCell>
              <TableCell>{price.source?.nome}</TableCell>
              <TableCell>
                <PriceStatusBadge status={price.status} />
                {price.motivo_rejeicao && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {price.motivo_rejeicao}
                  </p>
                )}
              </TableCell>
              <TableCell>
                {format(new Date(price.data_referencia), "dd/MM/yyyy", {
                  locale: pt,
                })}
              </TableCell>
              <TableCell>
                {format(new Date(price.created_at), "dd/MM/yyyy HH:mm", {
                  locale: pt,
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
