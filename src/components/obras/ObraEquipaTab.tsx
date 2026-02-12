import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Plus, Trash2, Loader2 } from 'lucide-react';
import { useAlocacoesByObra, useAlocacoes } from '@/hooks/useAlocacoes';
import { useEquipaMembros } from '@/hooks/useRecursos';
import { useObras } from '@/hooks/useObras';
import { AlocacaoForm } from '@/components/recursos/AlocacaoForm';
import type { AlocacaoObra } from '@/types/alocacoes';

interface ObraEquipaTabProps {
  obraId: string;
}

export function ObraEquipaTab({ obraId }: ObraEquipaTabProps) {
  const { alocacoes, loading, refetch } = useAlocacoesByObra(obraId);
  const { membros } = useEquipaMembros();
  const { obras } = useObras();
  const { createAlocacao, deleteAlocacao } = useAlocacoes();
  const [formOpen, setFormOpen] = useState(false);
  const [deletingAlocacao, setDeletingAlocacao] = useState<AlocacaoObra | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

  const alocacoesAtivas = alocacoes.filter(a => a.ativo);
  const totalCustoDiario = alocacoesAtivas.reduce((sum, a) => sum + (a.custo_dia || 0), 0);
  const totalCustoHora = alocacoesAtivas.reduce((sum, a) => sum + (a.custo_hora || 0), 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Equipa Alocada
            {alocacoesAtivas.length > 0 && (
              <Badge variant="secondary" className="ml-2">{alocacoesAtivas.length}</Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Alocar Membro
          </Button>
        </CardHeader>
        <CardContent>
          {/* Resumo de custos */}
          {alocacoesAtivas.length > 0 && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg mb-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Custo/Dia Total</p>
                <p className="text-lg font-semibold">{formatCurrency(totalCustoDiario)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Custo/Hora Total</p>
                <p className="text-lg font-semibold">{formatCurrency(totalCustoHora)}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : alocacoesAtivas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum membro da equipa alocado a esta obra.</p>
              <Button variant="outline" className="mt-4" onClick={() => setFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Alocar Primeiro Membro
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Função</TableHead>
                    <TableHead className="hidden md:table-cell">Desde</TableHead>
                    <TableHead>Custo/Dia</TableHead>
                    <TableHead>Custo/Hora</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alocacoesAtivas.map((aloc) => (
                    <TableRow key={aloc.id}>
                      <TableCell>
                        <div className="font-medium">{aloc.membro?.nome || '-'}</div>
                        {aloc.membro?.cargo && (
                          <div className="text-xs text-muted-foreground">{aloc.membro.cargo}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {aloc.funcao || '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {format(new Date(aloc.data_inicio), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {aloc.custo_dia ? formatCurrency(aloc.custo_dia) : '-'}
                      </TableCell>
                      <TableCell>
                        {aloc.custo_hora ? formatCurrency(aloc.custo_hora) : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingAlocacao(aloc)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlocacaoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        membros={membros}
        obras={obras?.filter(o => !o.arquivada).map(o => ({ id: o.id, nome: o.nome })) || []}
        defaultObraId={obraId}
        isLoading={isSubmitting}
        onSubmit={async (data) => {
          setIsSubmitting(true);
          await createAlocacao(data);
          await refetch();
          setIsSubmitting(false);
        }}
      />

      <AlertDialog open={!!deletingAlocacao} onOpenChange={() => setDeletingAlocacao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja remover {deletingAlocacao?.membro?.nome} desta obra?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingAlocacao) {
                  await deleteAlocacao(deletingAlocacao.id);
                  await refetch();
                  setDeletingAlocacao(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
