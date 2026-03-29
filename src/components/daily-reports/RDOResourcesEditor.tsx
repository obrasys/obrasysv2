import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useDailyReportResources } from '@/hooks/useDailyReports';
import {
  Plus, Trash2, Users, Wrench, Package, HardHat, CheckCircle2,
  AlertTriangle, Clock,
} from 'lucide-react';
import type { EquipmentStatus } from '@/types/daily-reports';

interface Props {
  reportId: string;
  obraId: string;
  readOnly?: boolean;
}

const EQUIPMENT_STATUS_OPTIONS: { value: EquipmentStatus; label: string }[] = [
  { value: 'operational', label: 'Operacional' },
  { value: 'broken', label: 'Avariado' },
  { value: 'maintenance', label: 'Manutenção' },
];

const MATERIAL_UNITS = ['un', 'kg', 'ton', 'm', 'ml', 'm²', 'm³', 'l', 'saco', 'palete', 'cx'];

export function RDOResourcesEditor({ reportId, obraId, readOnly }: Props) {
  const {
    labor, equipment, materials,
    addLabor, removeLabor,
    addEquipment, removeEquipment,
    addMaterial, removeMaterial,
  } = useDailyReportResources(reportId);

  const [activeSection, setActiveSection] = useState('labor');

  // Labor form
  const [laborForm, setLaborForm] = useState({
    role_name: '',
    planned_workers_count: 0,
    present_workers_count: 0,
    hours_per_resource: 8,
    absences_count: 0,
    performance_notes: '',
  });
  const [showLaborForm, setShowLaborForm] = useState(false);

  // Equipment form
  const [equipForm, setEquipForm] = useState({
    equipment_name: '',
    quantity: 1,
    available_hours: 8,
    hours_in_use: 0,
    downtime_hours: 0,
    downtime_reason: '',
    equipment_status: 'operational' as EquipmentStatus,
  });
  const [showEquipForm, setShowEquipForm] = useState(false);

  // Material form
  const [matForm, setMatForm] = useState({
    material_name: '',
    consumed_quantity_today: 0,
    received_quantity_today: 0,
    unit: 'un',
    shortage_flag: false,
    rejected_quantity: 0,
    stock_risk_flag: false,
    supplier_name: '',
    batch_reference: '',
  });
  const [showMatForm, setShowMatForm] = useState(false);

  const handleAddLabor = () => {
    addLabor.mutate({
      daily_report_id: reportId,
      obra_id: obraId,
      role_name: laborForm.role_name,
      planned_workers_count: laborForm.planned_workers_count,
      present_workers_count: laborForm.present_workers_count,
      hours_per_resource: laborForm.hours_per_resource,
      absences_count: laborForm.absences_count,
      performance_notes: laborForm.performance_notes || undefined,
    });
    setLaborForm({ role_name: '', planned_workers_count: 0, present_workers_count: 0, hours_per_resource: 8, absences_count: 0, performance_notes: '' });
    setShowLaborForm(false);
  };

  const handleAddEquipment = () => {
    addEquipment.mutate({
      daily_report_id: reportId,
      obra_id: obraId,
      equipment_name: equipForm.equipment_name,
      quantity: equipForm.quantity,
      available_hours: equipForm.available_hours,
      hours_in_use: equipForm.hours_in_use,
      downtime_hours: equipForm.downtime_hours,
      downtime_reason: equipForm.downtime_reason || undefined,
      equipment_status: equipForm.equipment_status,
    });
    setEquipForm({ equipment_name: '', quantity: 1, available_hours: 8, hours_in_use: 0, downtime_hours: 0, downtime_reason: '', equipment_status: 'operational' });
    setShowEquipForm(false);
  };

  const handleAddMaterial = () => {
    addMaterial.mutate({
      daily_report_id: reportId,
      obra_id: obraId,
      material_name: matForm.material_name,
      consumed_quantity_today: matForm.consumed_quantity_today,
      received_quantity_today: matForm.received_quantity_today,
      unit: matForm.unit,
      shortage_flag: matForm.shortage_flag,
      rejected_quantity: matForm.rejected_quantity,
      stock_risk_flag: matForm.stock_risk_flag,
      supplier_name: matForm.supplier_name || undefined,
      batch_reference: matForm.batch_reference || undefined,
    });
    setMatForm({ material_name: '', consumed_quantity_today: 0, received_quantity_today: 0, unit: 'un', shortage_flag: false, rejected_quantity: 0, stock_risk_flag: false, supplier_name: '', batch_reference: '' });
    setShowMatForm(false);
  };

  const totalWorkers = (labor || []).reduce((s, l) => s + l.present_workers_count, 0);
  const totalHoursLabor = (labor || []).reduce((s, l) => s + (l.present_workers_count * l.hours_per_resource), 0);
  const totalEquipHours = (equipment || []).reduce((s, e) => s + e.hours_in_use, 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-muted/30 cursor-pointer" onClick={() => setActiveSection('labor')}>
          <CardContent className="py-3 text-center">
            <Users className={`h-4 w-4 mx-auto mb-1 ${activeSection === 'labor' ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-lg font-bold">{totalWorkers}</p>
            <p className="text-[10px] text-muted-foreground">Trabalhadores</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 cursor-pointer" onClick={() => setActiveSection('equipment')}>
          <CardContent className="py-3 text-center">
            <Wrench className={`h-4 w-4 mx-auto mb-1 ${activeSection === 'equipment' ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-lg font-bold">{(equipment || []).length}</p>
            <p className="text-[10px] text-muted-foreground">Equipamentos</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 cursor-pointer" onClick={() => setActiveSection('materials')}>
          <CardContent className="py-3 text-center">
            <Package className={`h-4 w-4 mx-auto mb-1 ${activeSection === 'materials' ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-lg font-bold">{(materials || []).length}</p>
            <p className="text-[10px] text-muted-foreground">Materiais</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="w-full">
          <TabsTrigger value="labor" className="flex-1 text-xs gap-1"><HardHat className="h-3 w-3" />Mão de obra</TabsTrigger>
          <TabsTrigger value="equipment" className="flex-1 text-xs gap-1"><Wrench className="h-3 w-3" />Equipamentos</TabsTrigger>
          <TabsTrigger value="materials" className="flex-1 text-xs gap-1"><Package className="h-3 w-3" />Materiais</TabsTrigger>
        </TabsList>

        {/* === LABOR === */}
        <TabsContent value="labor" className="mt-3 space-y-2">
          {(labor || []).map(l => (
            <Card key={l.id} className="border">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <HardHat className="h-3.5 w-3.5 text-muted-foreground" />
                      {l.role_name}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Previsto: {l.planned_workers_count}</span>
                      <span className={l.present_workers_count < l.planned_workers_count ? 'text-amber-600 font-medium' : ''}>
                        Presente: {l.present_workers_count}
                      </span>
                      <span>{l.hours_per_resource}h/pessoa</span>
                      {l.absences_count > 0 && (
                        <span className="text-destructive">Faltas: {l.absences_count}</span>
                      )}
                    </div>
                    {l.performance_notes && <p className="text-[10px] text-muted-foreground mt-1 italic">{l.performance_notes}</p>}
                  </div>
                  {!readOnly && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLabor.mutate(l.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {!readOnly && !showLaborForm && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setShowLaborForm(true)}>
              <Plus className="h-4 w-4 mr-2" />Adicionar mão de obra
            </Button>
          )}

          {showLaborForm && !readOnly && (
            <Card className="border-primary/30">
              <CardContent className="py-4 space-y-3">
                <div>
                  <Label className="text-xs">Função / Categoria *</Label>
                  <Input value={laborForm.role_name} onChange={e => setLaborForm(p => ({ ...p, role_name: e.target.value }))} placeholder="Ex: Pedreiro, Servente, Eletricista..." className="text-sm" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Previstos</Label>
                    <Input type="number" value={laborForm.planned_workers_count || ''} onChange={e => setLaborForm(p => ({ ...p, planned_workers_count: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Presentes</Label>
                    <Input type="number" value={laborForm.present_workers_count || ''} onChange={e => setLaborForm(p => ({ ...p, present_workers_count: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Horas/pessoa</Label>
                    <Input type="number" step="0.5" value={laborForm.hours_per_resource || ''} onChange={e => setLaborForm(p => ({ ...p, hours_per_resource: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Faltas</Label>
                    <Input type="number" value={laborForm.absences_count || ''} onChange={e => setLaborForm(p => ({ ...p, absences_count: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Notas de desempenho</Label>
                  <Textarea value={laborForm.performance_notes} onChange={e => setLaborForm(p => ({ ...p, performance_notes: e.target.value }))} placeholder="Produtividade, observações..." rows={2} className="text-sm" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowLaborForm(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleAddLabor} disabled={!laborForm.role_name || addLabor.isPending}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{addLabor.isPending ? 'A guardar...' : 'Registar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {(!labor || labor.length === 0) && !showLaborForm && (
            <p className="text-center text-xs text-muted-foreground py-4">Sem mão de obra registada.</p>
          )}

          {(labor || []).length > 0 && (
            <div className="text-xs text-muted-foreground text-right">
              Total: {totalWorkers} trabalhadores · {totalHoursLabor}h
            </div>
          )}
        </TabsContent>

        {/* === EQUIPMENT === */}
        <TabsContent value="equipment" className="mt-3 space-y-2">
          {(equipment || []).map(e => (
            <Card key={e.id} className="border">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                      {e.equipment_name}
                      <Badge variant={e.equipment_status === 'operational' ? 'default' : e.equipment_status === 'maintenance' ? 'secondary' : 'destructive'} className="text-[9px]">
                        {EQUIPMENT_STATUS_OPTIONS.find(o => o.value === e.equipment_status)?.label}
                      </Badge>
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Qtd: {e.quantity}</span>
                      <span>Disponível: {e.available_hours}h</span>
                      <span>Em uso: {e.hours_in_use}h</span>
                      {e.downtime_hours > 0 && (
                        <span className="text-amber-600">Parado: {e.downtime_hours}h</span>
                      )}
                    </div>
                    {e.downtime_reason && <p className="text-[10px] text-muted-foreground mt-1 italic">{e.downtime_reason}</p>}
                  </div>
                  {!readOnly && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEquipment.mutate(e.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {!readOnly && !showEquipForm && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setShowEquipForm(true)}>
              <Plus className="h-4 w-4 mr-2" />Adicionar equipamento
            </Button>
          )}

          {showEquipForm && !readOnly && (
            <Card className="border-primary/30">
              <CardContent className="py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Equipamento *</Label>
                    <Input value={equipForm.equipment_name} onChange={e => setEquipForm(p => ({ ...p, equipment_name: e.target.value }))} placeholder="Ex: Retroescavadora, Betoneira..." className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Quantidade</Label>
                    <Input type="number" value={equipForm.quantity || ''} onChange={e => setEquipForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Estado</Label>
                    <Select value={equipForm.equipment_status} onValueChange={v => setEquipForm(p => ({ ...p, equipment_status: v as EquipmentStatus }))}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Horas disponíveis</Label>
                    <Input type="number" step="0.5" value={equipForm.available_hours || ''} onChange={e => setEquipForm(p => ({ ...p, available_hours: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Horas em uso</Label>
                    <Input type="number" step="0.5" value={equipForm.hours_in_use || ''} onChange={e => setEquipForm(p => ({ ...p, hours_in_use: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Horas parado</Label>
                    <Input type="number" step="0.5" value={equipForm.downtime_hours || ''} onChange={e => setEquipForm(p => ({ ...p, downtime_hours: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
                {equipForm.downtime_hours > 0 && (
                  <div>
                    <Label className="text-xs">Motivo paragem</Label>
                    <Input value={equipForm.downtime_reason} onChange={e => setEquipForm(p => ({ ...p, downtime_reason: e.target.value }))} placeholder="Motivo da paragem..." className="text-sm" />
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowEquipForm(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleAddEquipment} disabled={!equipForm.equipment_name || addEquipment.isPending}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{addEquipment.isPending ? 'A guardar...' : 'Registar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {(!equipment || equipment.length === 0) && !showEquipForm && (
            <p className="text-center text-xs text-muted-foreground py-4">Sem equipamentos registados.</p>
          )}

          {(equipment || []).length > 0 && (
            <div className="text-xs text-muted-foreground text-right">
              Total em uso: {totalEquipHours}h
            </div>
          )}
        </TabsContent>

        {/* === MATERIALS === */}
        <TabsContent value="materials" className="mt-3 space-y-2">
          {(materials || []).map(m => (
            <Card key={m.id} className="border">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      {m.material_name}
                      {m.shortage_flag && <Badge variant="destructive" className="text-[9px]">Rutura</Badge>}
                      {m.stock_risk_flag && <Badge variant="secondary" className="text-[9px]">Risco stock</Badge>}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Consumido: {m.consumed_quantity_today} {m.unit}</span>
                      <span>Recebido: {m.received_quantity_today} {m.unit}</span>
                      {m.rejected_quantity > 0 && (
                        <span className="text-destructive">Rejeitado: {m.rejected_quantity} {m.unit}</span>
                      )}
                    </div>
                    {m.supplier_name && <p className="text-[10px] text-muted-foreground mt-1">Fornecedor: {m.supplier_name}</p>}
                    {m.batch_reference && <p className="text-[10px] text-muted-foreground">Lote: {m.batch_reference}</p>}
                  </div>
                  {!readOnly && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMaterial.mutate(m.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {!readOnly && !showMatForm && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setShowMatForm(true)}>
              <Plus className="h-4 w-4 mr-2" />Adicionar material
            </Button>
          )}

          {showMatForm && !readOnly && (
            <Card className="border-primary/30">
              <CardContent className="py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Material *</Label>
                    <Input value={matForm.material_name} onChange={e => setMatForm(p => ({ ...p, material_name: e.target.value }))} placeholder="Ex: Cimento CEM II, Tijolo 11, Aço A500..." className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Unidade</Label>
                    <Select value={matForm.unit} onValueChange={v => setMatForm(p => ({ ...p, unit: v }))}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MATERIAL_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Fornecedor</Label>
                    <Input value={matForm.supplier_name} onChange={e => setMatForm(p => ({ ...p, supplier_name: e.target.value }))} placeholder="Nome do fornecedor" className="text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Consumido hoje</Label>
                    <Input type="number" step="0.1" value={matForm.consumed_quantity_today || ''} onChange={e => setMatForm(p => ({ ...p, consumed_quantity_today: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Recebido hoje</Label>
                    <Input type="number" step="0.1" value={matForm.received_quantity_today || ''} onChange={e => setMatForm(p => ({ ...p, received_quantity_today: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Rejeitado</Label>
                    <Input type="number" step="0.1" value={matForm.rejected_quantity || ''} onChange={e => setMatForm(p => ({ ...p, rejected_quantity: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Referência lote</Label>
                  <Input value={matForm.batch_reference} onChange={e => setMatForm(p => ({ ...p, batch_reference: e.target.value }))} placeholder="Nº lote ou guia" className="text-sm" />
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={matForm.shortage_flag} onCheckedChange={v => setMatForm(p => ({ ...p, shortage_flag: v }))} />
                    <Label className="text-xs flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-destructive" />Rutura de stock
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={matForm.stock_risk_flag} onCheckedChange={v => setMatForm(p => ({ ...p, stock_risk_flag: v }))} />
                    <Label className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-600" />Risco de stock
                    </Label>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowMatForm(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleAddMaterial} disabled={!matForm.material_name || addMaterial.isPending}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{addMaterial.isPending ? 'A guardar...' : 'Registar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {(!materials || materials.length === 0) && !showMatForm && (
            <p className="text-center text-xs text-muted-foreground py-4">Sem materiais registados.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
