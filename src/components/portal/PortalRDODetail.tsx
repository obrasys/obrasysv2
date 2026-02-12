import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Calendar, Users, Cloud } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { RDOPdfExport } from '@/components/rdos/RDOPdfExport';

interface PortalRDODetailProps {
  rdo: {
    id: string;
    data: string;
    status: string;
    trabalhos_executados: string | null;
    condicoes_meteorologicas: string | null;
    mao_de_obra_presente: number | null;
    ocorrencias: string | null;
    observacoes: string | null;
    fotos: string[] | null;
    trabalhos_quantificados: unknown;
    created_at: string;
    aprovado_em: string | null;
  };
  obraNome: string;
  onClose: () => void;
  onLogEvent: (eventType: string, entityType?: string, entityId?: string) => void;
}

export function PortalRDODetail({ rdo, obraNome, onClose, onLogEvent }: PortalRDODetailProps) {
  const handleDownload = () => {
    onLogEvent('rdo_download', 'rdo', rdo.id);
  };

  // Adapt the RDO to match the RDOPdfExport expected format
  const rdoForPdf = {
    ...rdo,
    obra: { nome: obraNome },
    trabalhos_quantificados: (rdo.trabalhos_quantificados as Array<{ descricao: string; quantidade: number; unidade: string }>) || [],
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>RDO — {format(new Date(rdo.data), "d 'de' MMMM 'de' yyyy", { locale: pt })}</span>
            <Badge
              className={
                rdo.status === 'aprovado'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }
            >
              {rdo.status === 'aprovado' ? 'Aprovado' : 'Submetido'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(rdo.data), 'dd/MM/yyyy')}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Cloud className="h-4 w-4" />
              {rdo.condicoes_meteorologicas || 'N/D'}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {rdo.mao_de_obra_presente || 0} trabalhadores
            </div>
          </div>

          {/* Trabalhos executados */}
          {rdo.trabalhos_executados && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-1">Trabalhos Executados</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rdo.trabalhos_executados}</p>
            </div>
          )}

          {/* Ocorrências */}
          {rdo.ocorrencias && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-1">Ocorrências</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rdo.ocorrencias}</p>
            </div>
          )}

          {/* Observações */}
          {rdo.observacoes && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-1">Observações</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rdo.observacoes}</p>
            </div>
          )}

          {/* Photos count */}
          {rdo.fotos && rdo.fotos.length > 0 && (
            <p className="text-sm text-muted-foreground">
              📷 {rdo.fotos.length} fotografia(s) disponível(eis) na secção Fotografias.
            </p>
          )}

          {/* Download */}
          <div className="flex justify-end pt-2 border-t border-border" onClick={handleDownload}>
            <RDOPdfExport rdo={rdoForPdf as any} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
