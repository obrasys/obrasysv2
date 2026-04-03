import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Mountain } from "lucide-react";
import {
  TIPO_SOLO_OPTIONS,
  ZONA_SISMICA_OPTIONS,
  TOPOGRAFIA_OPTIONS,
  type PlanSiteCondition,
  type TipoSolo,
  type ZonaSismica,
  type Topografia,
} from "@/types/plan-infra";

interface Props {
  siteCondition: PlanSiteCondition | null;
  onSave: (data: Partial<PlanSiteCondition>) => void;
  isSaving: boolean;
}

export function PlanSiteConditionsForm({ siteCondition, onSave, isSaving }: Props) {
  const [form, setForm] = useState({
    tipo_solo: "misto" as TipoSolo,
    capacidade_portante_kpa: 150,
    nivel_freatico_m: 3,
    zona_sismica: "B" as ZonaSismica,
    topografia: "plano" as Topografia,
    area_implantacao_m2: 0,
    numero_pisos: 1,
    observacoes: "",
  });

  useEffect(() => {
    if (siteCondition) {
      setForm({
        tipo_solo: siteCondition.tipo_solo,
        capacidade_portante_kpa: siteCondition.capacidade_portante_kpa,
        nivel_freatico_m: siteCondition.nivel_freatico_m,
        zona_sismica: siteCondition.zona_sismica,
        topografia: siteCondition.topografia,
        area_implantacao_m2: siteCondition.area_implantacao_m2,
        numero_pisos: siteCondition.numero_pisos,
        observacoes: siteCondition.observacoes || "",
      });
    }
  }, [siteCondition]);

  const handleSave = () => onSave(form);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mountain className="w-4 h-4" /> Condições do Terreno
        </CardTitle>
        <CardDescription>Parâmetros do solo e implantação para estimativa de fundações.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Tipo de Solo</Label>
            <Select value={form.tipo_solo} onValueChange={(v) => setForm((f) => ({ ...f, tipo_solo: v as TipoSolo }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPO_SOLO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Capacidade Portante (kPa)</Label>
            <Input
              type="number"
              value={form.capacidade_portante_kpa}
              onChange={(e) => setForm((f) => ({ ...f, capacidade_portante_kpa: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Nível Freático (m)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.nivel_freatico_m}
              onChange={(e) => setForm((f) => ({ ...f, nivel_freatico_m: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Zona Sísmica</Label>
            <Select value={form.zona_sismica} onValueChange={(v) => setForm((f) => ({ ...f, zona_sismica: v as ZonaSismica }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ZONA_SISMICA_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Topografia</Label>
            <Select value={form.topografia} onValueChange={(v) => setForm((f) => ({ ...f, topografia: v as Topografia }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TOPOGRAFIA_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Área de Implantação (m²)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.area_implantacao_m2}
              onChange={(e) => setForm((f) => ({ ...f, area_implantacao_m2: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Número de Pisos</Label>
            <Input
              type="number"
              min={1}
              value={form.numero_pisos}
              onChange={(e) => setForm((f) => ({ ...f, numero_pisos: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Observações</Label>
          <Textarea
            value={form.observacoes}
            onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
            placeholder="Notas adicionais sobre o terreno..."
            rows={2}
          />
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Condições
        </Button>
      </CardContent>
    </Card>
  );
}
