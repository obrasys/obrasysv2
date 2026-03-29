import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

interface TimesheetFiltersProps {
  filterSubempreiteiro: string;
  onFilterSubempreiteiroChange: (value: string) => void;
  filterEquipa: string;
  onFilterEquipaChange: (value: string) => void;
  workDate: string;
  onWorkDateChange: (value: string) => void;
  subempreiteiros: { id: string; nome: string; ativo: boolean }[];
  equipaMembros: { id: string; nome: string; cargo?: string | null; ativo: boolean }[];
}

export function TimesheetFilters({
  filterSubempreiteiro,
  onFilterSubempreiteiroChange,
  filterEquipa,
  onFilterEquipaChange,
  workDate,
  onWorkDateChange,
  subempreiteiros,
  equipaMembros,
}: TimesheetFiltersProps) {
  const activeSubempreiteiros = subempreiteiros.filter((s) => s.ativo);
  const activeEquipaMembros = equipaMembros.filter((m) => m.ativo);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Filter className="h-4 w-4 text-muted-foreground" />
        Contexto
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Subempreiteiro</Label>
          <Select
            value={filterSubempreiteiro || "all"}
            onValueChange={(v) => onFilterSubempreiteiroChange(v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {activeSubempreiteiros.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Equipa</Label>
          <Select
            value={filterEquipa || "all"}
            onValueChange={(v) => onFilterEquipaChange(v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {activeEquipaMembros.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome} {m.cargo ? `(${m.cargo})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Data</Label>
          <Input
            type="date"
            value={workDate}
            onChange={(e) => onWorkDateChange(e.target.value)}
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}
