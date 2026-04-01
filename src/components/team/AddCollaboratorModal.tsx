import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ModulePermissionsGrid } from './ModulePermissionsGrid';
import { ObraSelector } from './ObraSelector';
import { getDefaultPermissions, ACCESS_PROFILES } from '@/config/accessProfiles';
import { ROLE_LABELS, ROLE_COLORS, type RoleCode, type InviteFormData, type ModulePermission, type ObraScope } from '@/types/team';
import { ChevronLeft, ChevronRight, Send, Info, User, Shield, LayoutGrid, Building2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obras: { id: string; nome: string; estado: string }[];
  onSubmit: (data: InviteFormData) => void;
  isPending: boolean;
}

const STEPS = [
  { num: 1, label: 'Dados', icon: User },
  { num: 2, label: 'Role', icon: Shield },
  { num: 3, label: 'Módulos', icon: LayoutGrid },
  { num: 4, label: 'Obras', icon: Building2 },
];

const ASSIGNABLE_ROLES: RoleCode[] = ['admin', 'manager', 'technician', 'finance', 'viewer'];

export function AddCollaboratorModal({ open, onOpenChange, obras, onSubmit, isPending }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<InviteFormData>({
    full_name: '',
    email: '',
    phone: '',
    job_title: '',
    internal_note: '',
    role_code: 'manager',
    obra_scope: 'all',
    module_permissions: getDefaultPermissions('manager'),
    selected_obras: [],
  });

  const resetForm = () => {
    setStep(1);
    setForm({
      full_name: '', email: '', phone: '', job_title: '', internal_note: '',
      role_code: 'manager', obra_scope: 'all',
      module_permissions: getDefaultPermissions('manager'), selected_obras: [],
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const canNext = () => {
    if (step === 1) return form.full_name.trim() && form.email.trim() && form.email.includes('@');
    return true;
  };

  const handleRoleChange = (role: RoleCode) => {
    setForm(f => ({
      ...f,
      role_code: role,
      module_permissions: getDefaultPermissions(role),
    }));
  };

  const handleSubmit = () => {
    onSubmit(form);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Colaborador</DialogTitle>
          <DialogDescription>
            Este colaborador será adicionado à sua conta da empresa. Não será criada uma nova conta de empresa.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 py-2">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => s.num < step && setStep(s.num)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors w-full justify-center ${
                  step === s.num
                    ? 'bg-primary text-primary-foreground'
                    : step > s.num
                    ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <s.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.num}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Dados */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome Completo *</Label>
                <Input
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Nome do colaborador"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telemóvel</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+351 912 345 678"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cargo / Função</Label>
                <Input
                  value={form.job_title}
                  onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))}
                  placeholder="Ex: Encarregado"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nota Interna</Label>
              <Textarea
                value={form.internal_note}
                onChange={e => setForm(f => ({ ...f, internal_note: e.target.value }))}
                placeholder="Nota privada sobre este convite..."
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Step 2: Role */}
        {step === 2 && (
          <div className="space-y-4">
            <RadioGroup value={form.role_code} onValueChange={(v) => handleRoleChange(v as RoleCode)}>
              {ACCESS_PROFILES.filter(p => ASSIGNABLE_ROLES.includes(p.role)).map(profile => (
                <label
                  key={profile.role}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    form.role_code === profile.role
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <RadioGroupItem value={profile.role} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{profile.label}</span>
                      <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[profile.role]}`}>
                        {profile.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{profile.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                As permissões serão pré-preenchidas com base na role selecionada. Pode personalizar no próximo passo.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 3: Module Permissions */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Permissões pré-preenchidas para <strong>{ROLE_LABELS[form.role_code]}</strong>. Personalize conforme necessário.
            </p>
            <ModulePermissionsGrid
              permissions={form.module_permissions}
              onChange={perms => setForm(f => ({ ...f, module_permissions: perms }))}
            />
          </div>
        )}

        {/* Step 4: Obra Access */}
        {step === 4 && (
          <div className="space-y-4">
            <RadioGroup
              value={form.obra_scope}
              onValueChange={v => setForm(f => ({ ...f, obra_scope: v as ObraScope }))}
            >
              {[
                { value: 'all', label: 'Todas as obras', desc: 'Acesso a todas as obras da empresa, atuais e futuras' },
                { value: 'assigned', label: 'Apenas obras atribuídas', desc: 'Acesso restrito às obras selecionadas abaixo' },
                { value: 'none', label: 'Sem acesso a obras', desc: 'O colaborador não terá acesso a nenhuma obra inicialmente' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    form.obra_scope === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}
                >
                  <RadioGroupItem value={opt.value} className="mt-0.5" />
                  <div>
                    <span className="text-sm font-medium">{opt.label}</span>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>

            {form.obra_scope === 'assigned' && (
              <ObraSelector
                obras={obras}
                selected={form.selected_obras}
                onChange={ids => setForm(f => ({ ...f, selected_obras: ids }))}
              />
            )}

            <Alert className="bg-primary/5 border-primary/20">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs text-foreground">
                O colaborador usará a conta da sua empresa no Obra Sys. Não será criada uma nova conta.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          {step > 1 ? (
            <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
          ) : (
            <div />
          )}
          {step < 4 ? (
            <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
              Seguinte
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={isPending}>
              <Send className="h-4 w-4 mr-1" />
              {isPending ? 'A enviar...' : 'Enviar Convite'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
