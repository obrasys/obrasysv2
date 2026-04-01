import { type RoleCode, type ModulePermission, MODULE_CODES } from '@/types/team';

export interface AccessProfile {
  role: RoleCode;
  label: string;
  description: string;
  permissions: ModulePermission[];
}

function allPerms(view: boolean, create: boolean, update: boolean, del: boolean): ModulePermission[] {
  return MODULE_CODES.map(code => ({
    module_code: code,
    can_view: view,
    can_create: create,
    can_update: update,
    can_delete: del,
  }));
}

function customPerms(overrides: Partial<Record<typeof MODULE_CODES[number], [boolean, boolean, boolean, boolean]>>): ModulePermission[] {
  return MODULE_CODES.map(code => {
    const o = overrides[code];
    return {
      module_code: code,
      can_view: o ? o[0] : false,
      can_create: o ? o[1] : false,
      can_update: o ? o[2] : false,
      can_delete: o ? o[3] : false,
    };
  });
}

export const ACCESS_PROFILES: AccessProfile[] = [
  {
    role: 'admin',
    label: 'Administrador',
    description: 'Acesso total a todos os módulos e gestão de equipa',
    permissions: allPerms(true, true, true, true),
  },
  {
    role: 'manager',
    label: 'Gestor de Obra',
    description: 'Gestão completa de obras, orçamentos e equipa de obra',
    permissions: customPerms({
      orcamentos: [true, true, true, true],
      obras: [true, true, true, false],
      cronograma: [true, true, true, false],
      rdo: [true, true, true, false],
      medicoes: [true, true, true, false],
      progresso: [true, true, true, false],
      documentos: [true, true, true, false],
      clientes: [true, true, true, false],
      fornecedores: [true, false, false, false],
      dashboards: [true, false, false, false],
      equipa: [true, false, false, false],
      configuracoes: [false, false, false, false],
      axia: [true, false, false, false],
    }),
  },
  {
    role: 'technician',
    label: 'Técnico de Obra',
    description: 'Execução diária: RDO, medições, progresso, documentos',
    permissions: customPerms({
      orcamentos: [true, false, false, false],
      obras: [true, false, false, false],
      cronograma: [true, false, true, false],
      rdo: [true, true, true, false],
      medicoes: [true, true, true, false],
      progresso: [true, true, true, false],
      documentos: [true, true, false, false],
      clientes: [false, false, false, false],
      fornecedores: [false, false, false, false],
      dashboards: [true, false, false, false],
      equipa: [false, false, false, false],
      configuracoes: [false, false, false, false],
      axia: [true, false, false, false],
    }),
  },
  {
    role: 'finance',
    label: 'Financeiro',
    description: 'Orçamentos, medições, clientes e relatórios financeiros',
    permissions: customPerms({
      orcamentos: [true, true, true, false],
      obras: [true, false, false, false],
      cronograma: [true, false, false, false],
      rdo: [true, false, false, false],
      medicoes: [true, true, true, false],
      progresso: [true, false, false, false],
      documentos: [true, true, false, false],
      clientes: [true, true, true, false],
      fornecedores: [true, true, true, false],
      dashboards: [true, false, false, false],
      equipa: [false, false, false, false],
      configuracoes: [false, false, false, false],
      axia: [true, false, false, false],
    }),
  },
  {
    role: 'viewer',
    label: 'Leitor',
    description: 'Apenas visualização, sem permissões de criação ou edição',
    permissions: allPerms(true, false, false, false),
  },
];

export function getDefaultPermissions(role: RoleCode): ModulePermission[] {
  const profile = ACCESS_PROFILES.find(p => p.role === role);
  return profile ? [...profile.permissions.map(p => ({ ...p }))] : allPerms(false, false, false, false);
}
