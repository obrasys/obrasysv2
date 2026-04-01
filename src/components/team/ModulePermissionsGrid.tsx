import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MODULE_CODES, MODULE_LABELS, type ModulePermission } from '@/types/team';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  permissions: ModulePermission[];
  onChange: (permissions: ModulePermission[]) => void;
  readOnly?: boolean;
}

export function ModulePermissionsGrid({ permissions, onChange, readOnly }: Props) {
  const getPermission = (code: string) =>
    permissions.find(p => p.module_code === code) || {
      module_code: code, can_view: false, can_create: false, can_update: false, can_delete: false,
    };

  const togglePermission = (code: string, field: keyof ModulePermission) => {
    if (readOnly) return;
    const updated = permissions.map(p => {
      if (p.module_code === code) {
        return { ...p, [field]: !p[field as keyof ModulePermission] };
      }
      return p;
    });
    // If not in array, add it
    if (!permissions.find(p => p.module_code === code)) {
      updated.push({ ...getPermission(code), [field]: true } as ModulePermission);
    }
    onChange(updated);
  };

  const toggleAllForModule = (code: string, checked: boolean) => {
    if (readOnly) return;
    const existing = permissions.filter(p => p.module_code !== code);
    existing.push({
      module_code: code as any,
      can_view: checked,
      can_create: checked,
      can_update: checked,
      can_delete: checked,
    });
    onChange(existing);
  };

  const fields: { key: keyof ModulePermission; label: string }[] = [
    { key: 'can_view', label: 'Ver' },
    { key: 'can_create', label: 'Criar' },
    { key: 'can_update', label: 'Editar' },
    { key: 'can_delete', label: 'Apagar' },
  ];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr,repeat(4,56px),56px] gap-0 bg-muted/50 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Módulo</span>
        {fields.map(f => (
          <span key={f.key} className="text-center">{f.label}</span>
        ))}
        <span className="text-center">Tudo</span>
      </div>
      {/* Rows */}
      {MODULE_CODES.map((code) => {
        const perm = getPermission(code);
        const allChecked = perm.can_view && perm.can_create && perm.can_update && perm.can_delete;
        return (
          <div
            key={code}
            className="grid grid-cols-[1fr,repeat(4,56px),56px] gap-0 px-3 py-2.5 border-t border-border/50 hover:bg-muted/30 transition-colors items-center"
          >
            <span className="text-sm font-medium text-foreground">{MODULE_LABELS[code]}</span>
            {fields.map(f => (
              <div key={f.key} className="flex justify-center">
                <Checkbox
                  checked={!!(perm as any)[f.key]}
                  onCheckedChange={() => togglePermission(code, f.key)}
                  disabled={readOnly}
                  className="h-4 w-4"
                />
              </div>
            ))}
            <div className="flex justify-center">
              <Checkbox
                checked={allChecked}
                onCheckedChange={(checked) => toggleAllForModule(code, !!checked)}
                disabled={readOnly}
                className="h-4 w-4"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
