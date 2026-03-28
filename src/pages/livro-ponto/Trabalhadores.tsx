import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowLeft, Pencil, Trash2, Users } from "lucide-react";
import { useWorkers, useCreateWorker, useUpdateWorker, useDeleteWorker } from "@/hooks/useLivroPonto";
import { useSubempreiteiros, useEquipaMembros } from "@/hooks/useRecursos";
import type { Worker } from "@/types/livro-ponto";

const emptyForm = {
  full_name: "",
  employee_code: "",
  role: "",
  employment_type: "full_time",
  default_hourly_cost: 0,
  default_daily_cost: 0,
  overtime_hourly_cost: 0,
  active: true,
  start_date: "",
  end_date: "",
  subempreiteiro_id: "",
  equipa_membro_id: "",
};

export default function TrabalhadoresPage() {
  const navigate = useNavigate();
  const { data: workers = [], isLoading } = useWorkers();
  const createMutation = useCreateWorker();
  const updateMutation = useUpdateWorker();
  const deleteMutation = useDeleteWorker();
  const { subempreiteiros } = useSubempreiteiros();
  const { membros: equipaMembros } = useEquipaMembros();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (w: Worker) => {
    setEditingId(w.id);
    setForm({
      full_name: w.full_name,
      employee_code: w.employee_code || "",
      role: w.role || "",
      employment_type: w.employment_type,
      default_hourly_cost: w.default_hourly_cost,
      default_daily_cost: w.default_daily_cost,
      overtime_hourly_cost: w.overtime_hourly_cost,
      active: w.active,
      start_date: w.start_date || "",
      end_date: w.end_date || "",
      subempreiteiro_id: w.subempreiteiro_id || "",
      equipa_membro_id: w.equipa_membro_id || "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const payload: any = {
      ...form,
      employee_code: form.employee_code || null,
      role: form.role || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      subempreiteiro_id: form.subempreiteiro_id || null,
      equipa_membro_id: form.equipa_membro_id || null,
    };
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setOpen(false);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

  const activeSubempreiteiros = subempreiteiros.filter((s) => s.ativo);
  const activeEquipaMembros = equipaMembros.filter((m) => m.ativo);

  return (
    <AppLayout title="Trabalhadores" subtitle="Gestão de recursos humanos e custos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/livro-ponto")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Trabalhadores</h1>
              <p className="text-muted-foreground">Gestão de recursos humanos e custos</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Trabalhador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Trabalhador" : "Novo Trabalhador"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="Nome do trabalhador"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Código</Label>
                    <Input
                      value={form.employee_code}
                      onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                      placeholder="EMP-001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Função</Label>
                    <Input
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      placeholder="Ex: Pedreiro, Eletricista"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo Contrato</Label>
                    <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Tempo Inteiro</SelectItem>
                        <SelectItem value="part_time">Tempo Parcial</SelectItem>
                        <SelectItem value="contractor">Subcontratado</SelectItem>
                        <SelectItem value="temporary">Temporário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Subempreiteiro & Equipa */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subempreiteiro</Label>
                    <Select value={form.subempreiteiro_id || "none"} onValueChange={(v) => setForm({ ...form, subempreiteiro_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {activeSubempreiteiros.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Membro Equipa</Label>
                    <Select value={form.equipa_membro_id || "none"} onValueChange={(v) => setForm({ ...form, equipa_membro_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {activeEquipaMembros.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.nome} {m.cargo ? `(${m.cargo})` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Custo/Hora (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.default_hourly_cost}
                      onChange={(e) => setForm({ ...form, default_hourly_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Custo/Dia (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.default_daily_cost}
                      onChange={(e) => setForm({ ...form, default_daily_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Extra/Hora (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.overtime_hourly_cost}
                      onChange={(e) => setForm({ ...form, overtime_hourly_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.active}
                    onCheckedChange={(v) => setForm({ ...form, active: v })}
                  />
                  <Label>Ativo</Label>
                </div>
                <Button onClick={handleSave} disabled={!form.full_name || createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Guardar Alterações" : "Criar Trabalhador"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Subempreiteiro</TableHead>
                      <TableHead>Equipa</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Custo/Hora</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-mono text-sm">{w.employee_code || "—"}</TableCell>
                        <TableCell className="font-medium">{w.full_name}</TableCell>
                        <TableCell>{w.role || "—"}</TableCell>
                        <TableCell className="text-sm">{w.subempreiteiro?.nome || "—"}</TableCell>
                        <TableCell className="text-sm">{w.equipa_membro?.nome || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {{
                            full_time: "Tempo Inteiro",
                            part_time: "Tempo Parcial",
                            contractor: "Subcontratado",
                            temporary: "Temporário",
                          }[w.employment_type] || w.employment_type}
                        </TableCell>
                        <TableCell>{formatCurrency(w.default_hourly_cost)}</TableCell>
                        <TableCell>
                          <Badge variant={w.active ? "default" : "secondary"}>
                            {w.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(w)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
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
    </AppLayout>
  );
}
