import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Briefcase, Coins, FileText } from "lucide-react";
import type { CompensationType } from "@/types/livro-ponto";

interface WorkerCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subempreiteiros: { id: string; nome: string; ativo: boolean }[];
  equipaMembros: { id: string; nome: string; cargo?: string | null; ativo: boolean }[];
  onSave: (data: WorkerFormData) => Promise<any>;
  isLoading?: boolean;
}

export interface WorkerFormData {
  full_name: string;
  employee_code: string | null;
  nif: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
  subempreiteiro_id: string | null;
  equipa_membro_id: string | null;
  employment_type: string;
  active: boolean;
  compensation_type: CompensationType;
  monthly_salary: number;
  hourly_rate: number;
  unit_rate_m2: number;
  unit_rate_ml: number;
  default_hourly_cost: number;
  default_daily_cost: number;
  overtime_hourly_cost: number;
  start_date: string | null;
  end_date: string | null;
  observacoes?: string;
}

const SECTION_ICON_CLASS = "h-4 w-4 text-primary";

export function WorkerCreateModal({
  open,
  onOpenChange,
  subempreiteiros,
  equipaMembros,
  onSave,
  isLoading,
}: WorkerCreateModalProps) {
  const [form, setForm] = useState<WorkerFormData>({
    full_name: "",
    employee_code: null,
    nif: null,
    phone: null,
    email: null,
    role: null,
    subempreiteiro_id: null,
    equipa_membro_id: null,
    employment_type: "full_time",
    active: true,
    compensation_type: "hourly",
    monthly_salary: 0,
    hourly_rate: 0,
    unit_rate_m2: 0,
    unit_rate_ml: 0,
    default_hourly_cost: 0,
    default_daily_cost: 0,
    overtime_hourly_cost: 0,
    start_date: null,
    end_date: null,
    observacoes: "",
  });

  const set = (updates: Partial<WorkerFormData>) => setForm((prev) => ({ ...prev, ...updates }));

  const isValid =
    form.full_name.trim() &&
    ((form.compensation_type === "hourly" && form.hourly_rate > 0) ||
      (form.compensation_type === "salary" && form.monthly_salary > 0));

  const handleSave = async () => {
    // Sync hourly_rate to default_hourly_cost for compatibility
    const { observacoes, ...rest } = form;
    const payload = {
      ...rest,
      default_hourly_cost: form.compensation_type === "hourly" ? form.hourly_rate : form.default_hourly_cost,
      employee_code: form.employee_code || null,
      nif: form.nif || null,
      phone: form.phone || null,
      email: form.email || null,
      role: form.role || null,
      start_date: form.start_date || null,
      end_date: null,
    };
    const result = await onSave(payload);
    // Reset form
    setForm({
      full_name: "", employee_code: null, nif: null, phone: null, email: null,
      role: null, subempreiteiro_id: null, equipa_membro_id: null,
      employment_type: "full_time", active: true, compensation_type: "hourly",
      monthly_salary: 0, hourly_rate: 0, unit_rate_m2: 0, unit_rate_ml: 0,
      default_hourly_cost: 0, default_daily_cost: 0, overtime_hourly_cost: 0,
      start_date: null, end_date: null, observacoes: "",
    });
    return result;
  };

  const activeSubempreiteiros = subempreiteiros.filter((s) => s.ativo);
  const activeEquipaMembros = equipaMembros.filter((m) => m.ativo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 top-[5%] translate-y-0 data-[state=open]:slide-in-from-top-2">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl">Novo Trabalhador</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Crie um novo trabalhador sem sair do registo de ponto.
          </p>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* SECTION 1 — Identification */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-border">
              <User className={SECTION_ICON_CLASS} />
              <h3 className="text-sm font-semibold text-foreground">Identificação</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome completo *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => set({ full_name: e.target.value })}
                  placeholder="Nome do trabalhador"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nº interno / código</Label>
                <Input
                  value={form.employee_code || ""}
                  onChange={(e) => set({ employee_code: e.target.value })}
                  placeholder="EMP-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label>NIF</Label>
                <Input
                  value={form.nif || ""}
                  onChange={(e) => set({ nif: e.target.value })}
                  placeholder="123456789"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telemóvel</Label>
                <Input
                  value={form.phone || ""}
                  onChange={(e) => set({ phone: e.target.value })}
                  placeholder="+351 912 345 678"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Função / cargo</Label>
                <Input
                  value={form.role || ""}
                  onChange={(e) => set({ role: e.target.value })}
                  placeholder="Ex: Pedreiro"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subempreiteiro</Label>
                <Select
                  value={form.subempreiteiro_id || "none"}
                  onValueChange={(v) => set({ subempreiteiro_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {activeSubempreiteiros.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Equipa</Label>
                <Select
                  value={form.equipa_membro_id || "none"}
                  onValueChange={(v) => set({ equipa_membro_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {activeEquipaMembros.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome} {m.cargo ? `(${m.cargo})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* SECTION 2 — Employment */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-border">
              <Briefcase className={SECTION_ICON_CLASS} />
              <h3 className="text-sm font-semibold text-foreground">Vínculo / estado</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de vínculo</Label>
                <Select value={form.employment_type} onValueChange={(v) => set({ employment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Interno</SelectItem>
                    <SelectItem value="contractor">Subempreiteiro</SelectItem>
                    <SelectItem value="temporary">Freelancer / eventual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-2.5 w-full">
                  <Switch checked={form.active} onCheckedChange={(v) => set({ active: v })} />
                  <span className="text-sm font-medium text-foreground">
                    {form.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3 — Compensation */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-border">
              <Coins className={SECTION_ICON_CLASS} />
              <h3 className="text-sm font-semibold text-foreground">Remuneração</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Defina como este trabalhador é remunerado.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => set({ compensation_type: "salary" })}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  form.compensation_type === "salary"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30"
                }`}
              >
                <div className="font-semibold">Ordenado</div>
                <div className="text-xs mt-0.5 opacity-70">Valor fixo mensal</div>
              </button>
              <button
                type="button"
                onClick={() => set({ compensation_type: "hourly" })}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  form.compensation_type === "hourly"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30"
                }`}
              >
                <div className="font-semibold">Por hora</div>
                <div className="text-xs mt-0.5 opacity-70">Valor calculado por hora</div>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {form.compensation_type === "salary" ? (
                <div className="col-span-2 space-y-1.5">
                  <Label>Valor do ordenado mensal (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.monthly_salary || ""}
                    onChange={(e) => set({ monthly_salary: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Valor por hora (€) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.hourly_rate || ""}
                      onChange={(e) => set({ hourly_rate: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Hora extra (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.overtime_hourly_cost || ""}
                      onChange={(e) => set({ overtime_hourly_cost: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* SECTION 4 — Additional */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-border">
              <FileText className={SECTION_ICON_CLASS} />
              <h3 className="text-sm font-semibold text-foreground">Dados adicionais</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data de entrada</Label>
                <Input
                  type="date"
                  value={form.start_date || ""}
                  onChange={(e) => set({ start_date: e.target.value || null })}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Observações</Label>
                <Textarea
                  value={form.observacoes || ""}
                  onChange={(e) => set({ observacoes: e.target.value })}
                  placeholder="Notas adicionais..."
                  rows={2}
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!isValid || isLoading}>
              {isLoading ? "A criar..." : "Criar Trabalhador"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
