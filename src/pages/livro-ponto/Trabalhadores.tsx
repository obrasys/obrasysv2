import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useWorkers, useCreateWorker, useUpdateWorker, useDeleteWorker } from "@/hooks/useLivroPonto";
import { useSubempreiteiros, useEquipaMembros } from "@/hooks/useRecursos";
import type { Worker } from "@/types/livro-ponto";
import { WorkerCreateModal } from "@/components/livro-ponto/WorkerCreateModal";

export default function TrabalhadoresPage() {
  const navigate = useNavigate();
  const { data: workers = [], isLoading } = useWorkers();
  const createMutation = useCreateWorker();
  const updateMutation = useUpdateWorker();
  const deleteMutation = useDeleteWorker();
  const { subempreiteiros } = useSubempreiteiros();
  const { membros: equipaMembros } = useEquipaMembros();

  const [modalOpen, setModalOpen] = useState(false);

  const handleCreate = async (data: any) => {
    await createMutation.mutateAsync(data);
    setModalOpen(false);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

  return (
    <AppLayout title="Trabalhadores" subtitle="Gestão de recursos humanos e custos">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Trabalhadores</h1>
            <p className="text-sm text-muted-foreground">Gestão de recursos humanos e custos</p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Trabalhador
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <p className="text-muted-foreground">A carregar...</p>
            ) : workers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">Sem trabalhadores registados</p>
                <p className="text-sm">Adicione trabalhadores para começar a registar horas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Subempreiteiro</TableHead>
                      <TableHead>Remuneração</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.map((w: Worker) => (
                      <TableRow key={w.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{w.full_name}</span>
                            {w.employee_code && (
                              <span className="text-xs text-muted-foreground ml-2">{w.employee_code}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{w.role || "—"}</TableCell>
                        <TableCell className="text-sm">{w.subempreiteiro?.nome || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {w.compensation_type === "salary" ? "Ordenado" : "Por hora"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {w.compensation_type === "salary"
                            ? `${formatCurrency(w.monthly_salary)}/mês`
                            : `${formatCurrency(w.hourly_rate || w.default_hourly_cost)}/h`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={w.active ? "default" : "secondary"}>
                            {w.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm("Eliminar este trabalhador?")) deleteMutation.mutate(w.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
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
      </div>

      <WorkerCreateModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        subempreiteiros={subempreiteiros}
        equipaMembros={equipaMembros}
        onSave={handleCreate}
        isLoading={createMutation.isPending}
      />
    </AppLayout>
  );
}
