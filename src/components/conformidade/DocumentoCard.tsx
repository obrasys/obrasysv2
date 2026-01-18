import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Edit,
  Trash2,
  Download,
  FileCheck,
  FileText,
  Award,
  FileBarChart,
  FileSignature,
  File,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Documento, DocumentoTipo } from '@/types/conformidade';
import { DOCUMENTO_TIPO_CONFIG } from '@/types/conformidade';

interface DocumentoCardProps {
  documento: Documento;
  onEdit: (documento: Documento) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string, aprovado: boolean) => void;
}

const ICON_MAP: Record<DocumentoTipo, React.ReactNode> = {
  licenca: <FileCheck className="w-8 h-8" />,
  projeto: <FileText className="w-8 h-8" />,
  certificado: <Award className="w-8 h-8" />,
  relatorio: <FileBarChart className="w-8 h-8" />,
  contrato: <FileSignature className="w-8 h-8" />,
  outro: <File className="w-8 h-8" />,
};

export function DocumentoCard({ documento, onEdit, onDelete, onApprove }: DocumentoCardProps) {
  const tipoConfig = DOCUMENTO_TIPO_CONFIG[documento.tipo];
  const isExpired = documento.data_validade && new Date(documento.data_validade) < new Date();

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`p-3 rounded-lg ${documento.aprovado ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
            {ICON_MAP[documento.tipo]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold truncate">{documento.nome}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {tipoConfig.label}
                  </Badge>
                  {documento.aprovado ? (
                    <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Aprovado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Pendente
                    </Badge>
                  )}
                  {isExpired && (
                    <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                      <XCircle className="w-3 h-3 mr-1" />
                      Expirado
                    </Badge>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem onClick={() => window.open(documento.url, '_blank')}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onApprove(documento.id, !documento.aprovado)}>
                    {documento.aprovado ? (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Remover aprovação
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Aprovar
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(documento)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(documento.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
              {documento.obra && (
                <div className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {documento.obra.nome}
                </div>
              )}
              {documento.data_validade && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Validade: {format(new Date(documento.data_validade), "dd/MM/yyyy", { locale: pt })}
                </div>
              )}
              {documento.file_size && (
                <span>{formatFileSize(documento.file_size)}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
