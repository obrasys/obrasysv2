export type RoleCode = 'owner' | 'admin' | 'manager' | 'technician' | 'finance' | 'viewer';

export type MemberStatus = 'active' | 'suspended' | 'invited' | 'revoked';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type ObraScope = 'all' | 'assigned' | 'none';
export type AccessLevel = 'full' | 'read';

export const ROLE_LABELS: Record<RoleCode, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  manager: 'Gestor de Obra',
  technician: 'Técnico de Obra',
  finance: 'Financeiro',
  viewer: 'Leitor',
};

export const ROLE_COLORS: Record<RoleCode, string> = {
  owner: 'bg-amber-500/15 text-amber-700 border-amber-200',
  admin: 'bg-red-500/15 text-red-700 border-red-200',
  manager: 'bg-blue-500/15 text-blue-700 border-blue-200',
  technician: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  finance: 'bg-purple-500/15 text-purple-700 border-purple-200',
  viewer: 'bg-muted text-muted-foreground border-border',
};

export const STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Ativo',
  suspended: 'Suspenso',
  invited: 'Convidado',
  revoked: 'Revogado',
};

export const STATUS_COLORS: Record<MemberStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  suspended: 'bg-orange-500/15 text-orange-700 border-orange-200',
  invited: 'bg-blue-500/15 text-blue-700 border-blue-200',
  revoked: 'bg-destructive/15 text-destructive border-destructive/30',
};

export const INVITE_STATUS_LABELS: Record<InviteStatus, string> = {
  pending: 'Pendente',
  accepted: 'Aceite',
  expired: 'Expirado',
  revoked: 'Revogado',
};

export const INVITE_STATUS_COLORS: Record<InviteStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-700 border-amber-200',
  accepted: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  expired: 'bg-muted text-muted-foreground border-border',
  revoked: 'bg-destructive/15 text-destructive border-destructive/30',
};

export const MODULE_CODES = [
  'orcamentos', 'obras', 'cronograma', 'rdo', 'medicoes', 'progresso',
  'documentos', 'clientes', 'fornecedores', 'dashboards', 'equipa', 'configuracoes', 'axia',
] as const;

export type ModuleCode = typeof MODULE_CODES[number];

export const MODULE_LABELS: Record<ModuleCode, string> = {
  orcamentos: 'Orçamentos',
  obras: 'Obras',
  cronograma: 'Cronograma',
  rdo: 'RDO',
  medicoes: 'Medições',
  progresso: 'Progresso',
  documentos: 'Documentos',
  clientes: 'Clientes',
  fornecedores: 'Fornecedores',
  dashboards: 'Dashboards',
  equipa: 'Equipa',
  configuracoes: 'Configurações',
  axia: 'Axia',
};

export interface ModulePermission {
  module_code: ModuleCode;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export interface TeamMember {
  id: string; // organization_members.id
  user_id: string;
  role: RoleCode;
  member_status: MemberStatus;
  job_title: string | null;
  obra_scope: ObraScope;
  last_seen_at: string | null;
  invited_by: string | null;
  // joined from profiles
  nome: string;
  email: string;
  avatar_url: string | null;
  // joined
  module_permissions: ModulePermission[];
  project_access: { obra_id: string; obra_nome: string; access_level: AccessLevel }[];
}

export interface TeamInvitation {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  job_title: string | null;
  internal_note: string | null;
  role_code: RoleCode;
  obra_scope: ObraScope;
  invited_by_user_id: string;
  status: InviteStatus;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  module_permissions: ModulePermission[];
}

export interface InviteFormData {
  full_name: string;
  email: string;
  phone: string;
  job_title: string;
  internal_note: string;
  role_code: RoleCode;
  obra_scope: ObraScope;
  module_permissions: ModulePermission[];
  selected_obras: string[];
}
