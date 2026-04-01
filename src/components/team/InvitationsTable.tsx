import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { InviteStatusBadge } from './MemberStatusBadge';
import { ROLE_LABELS, ROLE_COLORS, type TeamInvitation } from '@/types/team';
import { Search, MoreHorizontal, RefreshCw, XCircle, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Props {
  invitations: TeamInvitation[];
  onResend: (invitation: TeamInvitation) => void;
  onRevoke: (invitation: TeamInvitation) => void;
}

export function InvitationsTable({ invitations, onResend, onRevoke }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = invitations.filter(inv => {
    const matchSearch = !search || inv.email.toLowerCase().includes(search.toLowerCase()) || inv.full_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (invitations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Sem convites</h3>
        <p className="text-sm text-muted-foreground">Os convites enviados aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar por email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="accepted">Aceite</SelectItem>
            <SelectItem value="expired">Expirado</SelectItem>
            <SelectItem value="revoked">Revogado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Convidado</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden md:table-cell">Enviado em</TableHead>
              <TableHead className="hidden md:table-cell">Expira em</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(inv => {
              const isExpired = new Date(inv.expires_at) < new Date() && inv.status === 'pending';
              return (
                <TableRow key={inv.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{inv.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[inv.role_code]}`}>
                      {ROLE_LABELS[inv.role_code]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(inv.created_at), "d MMM yyyy", { locale: pt })}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className={`text-xs ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {format(new Date(inv.expires_at), "d MMM yyyy", { locale: pt })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <InviteStatusBadge status={isExpired ? 'expired' : inv.status} />
                  </TableCell>
                  <TableCell>
                    {inv.status === 'pending' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onResend(inv)}>
                            <RefreshCw className="h-3.5 w-3.5 mr-2" />
                            Reenviar Convite
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRevoke(inv)} className="text-destructive focus:text-destructive">
                            <XCircle className="h-3.5 w-3.5 mr-2" />
                            Revogar Convite
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
