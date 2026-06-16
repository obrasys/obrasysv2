import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Mail,
  Phone,
  MapPin,
  FileText,
  Upload,
} from 'lucide-react';
import type { Fornecedor } from '@/types/financeiro';

interface FornecedorCardProps {
  fornecedor: Fornecedor;
  onEdit: (fornecedor: Fornecedor) => void;
  onDelete: (id: string) => void;
  onImportPricebook?: (fornecedor: Fornecedor) => void;
}

export function FornecedorCard({ fornecedor, onEdit, onDelete }: FornecedorCardProps) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-semibold text-lg truncate">{fornecedor.nome}</h3>
              <Badge variant={fornecedor.ativo ? "default" : "secondary"}>
                {fornecedor.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
              {fornecedor.area_atuacao && (
                <Badge variant="outline" className="text-xs">{fornecedor.area_atuacao}</Badge>
              )}
            </div>

            <div className="space-y-1.5 text-sm text-muted-foreground">
              {fornecedor.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${fornecedor.email}`} className="hover:text-primary hover:underline">
                    {fornecedor.email}
                  </a>
                </div>
              )}

              {fornecedor.telefone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${fornecedor.telefone}`} className="hover:text-primary hover:underline">
                    {fornecedor.telefone}
                  </a>
                </div>
              )}

              {fornecedor.endereco && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{fornecedor.endereco}</span>
                </div>
              )}

              {fornecedor.nif && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>NIF: {fornecedor.nif}</span>
                </div>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(fornecedor)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(fornecedor.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
