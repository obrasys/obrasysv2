import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ObraStatusBadge } from '@/components/obras/ObraStatusBadge';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Eye, Table as TableIcon } from 'lucide-react';
import type { Obra, ObraStatus } from '@/types/obras';

interface ObrasSummaryTableProps {
  obras: Obra[];
}

const PAGE_SIZE = 5;

export function ObrasSummaryTable({ obras }: ObrasSummaryTableProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    return [...(obras || [])].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [obras]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: pt });
    } catch {
      return '—';
    }
  };

  if (!obras || obras.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TableIcon className="w-4 h-4" />
          Obras Registadas
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{sorted.length} obras</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">Cliente</TableHead>
                <TableHead className="text-xs">Progresso</TableHead>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs text-right">Valor</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((obra) => (
                <TableRow
                  key={obra.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/obras/${obra.id}`)}
                >
                  <TableCell className="font-medium text-sm max-w-[180px] truncate">
                    {obra.nome}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                    {obra.cliente || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Progress value={obra.progresso || 0} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium w-8 text-right">{Math.round(obra.progresso || 0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(obra.data_inicio)}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-right whitespace-nowrap">
                    {obra.valor_previsto ? formatCurrency(obra.valor_previsto) : '—'}
                  </TableCell>
                  <TableCell>
                    <ObraStatusBadge status={obra.status as ObraStatus} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
