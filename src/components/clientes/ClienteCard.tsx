import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClienteStatusBadge } from './ClienteStatusBadge';
import type { Cliente } from '@/types/clientes';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  Building2,
  FileText,
  HardHat,
  Power,
  PowerOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClienteCardProps {
  cliente: Cliente;
  onEdit?: (cliente: Cliente) => void;
  onDelete?: (cliente: Cliente) => void;
  onToggleAtivo?: (cliente: Cliente) => void;
}

export function ClienteCard({ cliente, onEdit, onDelete, onToggleAtivo }: ClienteCardProps) {
  const navigate = useNavigate();

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <Card className={`group transition-all hover:shadow-md ${!cliente.ativo ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(cliente.nome)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground truncate" title={cliente.nome}>
                  {cliente.nome}
                </h3>
                {cliente.empresa && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 min-w-0" title={cliente.empresa}>
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{cliente.empresa}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ClienteStatusBadge nivel={cliente.nivel_acesso} />
                {!cliente.ativo && (
                  <Badge variant="secondary">Inativo</Badge>
                )}
              </div>
            </div>

            {/* Contact info */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground min-w-0">
              {cliente.email && (
                <span className="flex items-center gap-1 min-w-0 max-w-full" title={cliente.email}>
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{cliente.email}</span>
                </span>
              )}
              {(cliente.telefone || cliente.telemovel) && (
                <span className="flex items-center gap-1 shrink-0">
                  <Phone className="h-3.5 w-3.5" />
                  {cliente.telemovel || cliente.telefone}
                </span>
              )}
            </div>

            {/* Counters */}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5 text-sm">
                <HardHat className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{cliente.obras_count || 0}</span>
                <span className="text-muted-foreground">obras</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{cliente.orcamentos_count || 0}</span>
                <span className="text-muted-foreground">orçamentos</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={() => navigate(`/clientes/${cliente.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(cliente)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onToggleAtivo?.(cliente)}>
                {cliente.ativo ? (
                  <>
                    <PowerOff className="mr-2 h-4 w-4" />
                    Desativar
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    Ativar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete?.(cliente)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
