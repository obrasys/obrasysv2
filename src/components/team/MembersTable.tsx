import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MemberStatusBadge } from './MemberStatusBadge';
import { ROLE_LABELS, ROLE_COLORS, MODULE_LABELS, type TeamMember, type RoleCode, type MemberStatus } from '@/types/team';
import { Search, MoreHorizontal, Shield, Eye, Pencil, UserX, UserCheck, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Props {
  members: TeamMember[];
  onEditPermissions: (member: TeamMember) => void;
  onSuspend: (member: TeamMember) => void;
  onReactivate: (member: TeamMember) => void;
  onRemove: (member: TeamMember) => void;
  currentUserId: string;
}

export function MembersTable({ members, onEditPermissions, onSuspend, onReactivate, onRemove, currentUserId }: Props) {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = members.filter(m => {
    const matchSearch = !search || m.nome.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || m.role === filterRole;
    const matchStatus = filterStatus === 'all' || m.member_status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Sem membros</h3>
        <p className="text-sm text-muted-foreground">Convide o primeiro colaborador para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as roles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="suspended">Suspenso</SelectItem>
            <SelectItem value="invited">Convidado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro</TableHead>
              <TableHead className="hidden md:table-cell">Cargo</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden lg:table-cell">Módulos</TableHead>
              <TableHead className="hidden lg:table-cell">Último acesso</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(member => {
              const isOwner = member.role === 'owner';
              const isSelf = member.user_id === currentUserId;
              const activeModules = member.module_permissions.filter(p => p.can_view).length;

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10">{getInitials(member.nome)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{member.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">{member.job_title || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[member.role]}`}>
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <MemberStatusBadge status={member.member_status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">{activeModules} módulo(s)</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {member.last_seen_at
                        ? format(new Date(member.last_seen_at), "d MMM yyyy", { locale: pt })
                        : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {!isOwner && !isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditPermissions(member)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Editar Permissões
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {member.member_status === 'active' ? (
                            <DropdownMenuItem onClick={() => onSuspend(member)}>
                              <UserX className="h-3.5 w-3.5 mr-2" />
                              Suspender
                            </DropdownMenuItem>
                          ) : member.member_status === 'suspended' ? (
                            <DropdownMenuItem onClick={() => onReactivate(member)}>
                              <UserCheck className="h-3.5 w-3.5 mr-2" />
                              Reativar
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem onClick={() => onRemove(member)} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {(isOwner || isSelf) && (
                      <Badge variant="outline" className="text-[9px]">
                        {isOwner ? 'Owner' : 'Você'}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
