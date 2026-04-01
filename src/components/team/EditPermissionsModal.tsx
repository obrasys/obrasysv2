import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ModulePermissionsGrid } from './ModulePermissionsGrid';
import { ObraSelector } from './ObraSelector';
import { getDefaultPermissions } from '@/config/accessProfiles';
import { ROLE_LABELS, type TeamMember, type ModulePermission, type ObraScope } from '@/types/team';
import { Save, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
  obras: { id: string; nome: string; status: string }[];
  onSave: (data: {
    memberId: string;
    permissions: ModulePermission[];
    obraScope: string;
    selectedObras?: string[];
  }) => void;
  isPending: boolean;
}

export function EditPermissionsModal({ open, onOpenChange, member, obras, onSave, isPending }: Props) {
  const [permissions, setPermissions] = useState<ModulePermission[]>(member?.module_permissions || []);
  const [obraScope, setObraScope] = useState<ObraScope>(member?.obra_scope || 'all');
  const [selectedObras, setSelectedObras] = useState<string[]>(
    member?.project_access.map(pa => pa.obra_id) || []
  );

  // Reset when member changes
  const resetToMember = () => {
    if (member) {
      setPermissions(member.module_permissions.length > 0 ? [...member.module_permissions] : getDefaultPermissions(member.role));
      setObraScope(member.obra_scope);
      setSelectedObras(member.project_access.map(pa => pa.obra_id));
    }
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) resetToMember();
    onOpenChange(isOpen);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permissões de {member.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Role info */}
          <div className="text-sm text-muted-foreground">
            Role: <strong>{ROLE_LABELS[member.role]}</strong>
          </div>

          {/* Module Permissions */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Permissões por Módulo</Label>
            <ModulePermissionsGrid
              permissions={permissions}
              onChange={setPermissions}
            />
          </div>

          {/* Obra Scope */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Acesso a Obras</Label>
            <RadioGroup value={obraScope} onValueChange={v => setObraScope(v as ObraScope)}>
              {[
                { value: 'all', label: 'Todas as obras' },
                { value: 'assigned', label: 'Apenas obras atribuídas' },
                { value: 'none', label: 'Sem acesso' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer ${
                    obraScope === opt.value ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <RadioGroupItem value={opt.value} />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
            {obraScope === 'assigned' && (
              <ObraSelector obras={obras} selected={selectedObras} onChange={setSelectedObras} />
            )}
          </div>

          <Button
            onClick={() => onSave({
              memberId: member.id,
              permissions,
              obraScope,
              selectedObras: obraScope === 'assigned' ? selectedObras : undefined,
            })}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
