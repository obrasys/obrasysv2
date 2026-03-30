import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, Users, Cloud, Sun, CloudRain, AlertTriangle, MessageSquare, FileText } from 'lucide-react';
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

const weatherLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  limpo: { label: 'Limpo', icon: <Sun className="h-4 w-4 text-amber-500" /> },
  nublado: { label: 'Nublado', icon: <Cloud className="h-4 w-4 text-muted-foreground" /> },
  chuva: { label: 'Chuva', icon: <CloudRain className="h-4 w-4 text-blue-500" /> },
};

export function PortalRDODetail({ rdo, obraNome, onClose, onLogEvent }: PortalRDODetailProps) {
  const handleDownload = () => {
    onLogEvent('rdo_download', 'rdo', rdo.id);
  };

  const rdoForPdf = {
    ...rdo,
    obra: { nome: obraNome },
    trabalhos_quantificados: (rdo.trabalhos_quantificados as Array<{ descricao: string; quantidade: number; unidade: string }>) || [],
  };

  const weather = weatherLabels[rdo.condicoes_meteorologicas || ''];

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="p-5 pb-0">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base">
                {format(new Date(rdo.data), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
              </DialogTitle>
              <Badge
                className={`text-[11px] ${
                  rdo.status === 'aprovado'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-50 text-blue-600'
                }`}
              >
                {rdo.status === 'aprovado' ? 'Aprovado' : 'Submetido'}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="p-5 pt-4 space-y-4">
          {/* Meta info cards */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="border bg-muted/30">
              <CardContent className="p-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="text-sm font-medium">{format(new Date(rdo.data), 'dd/MM/yyyy')}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border bg-muted/30">
              <CardContent className="p-3 flex items-center gap-2">
                {weather ? weather.icon : <Cloud className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div>
                  <p className="text-xs text-muted-foreground">Meteo</p>
                  <p className="text-sm font-medium">{weather?.label || 'N/D'}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border bg-muted/30">
              <CardContent className="p-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Equipa</p>
                  <p className="text-sm font-medium">{rdo.mao_de_obra_presente || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Trabalhos executados */}
          {rdo.trabalhos_executados && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Trabalhos Executados</h4>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed pl-6">
                {rdo.trabalhos_executados}
              </p>
            </div>
          )}

          {/* Ocorrências */}
          {rdo.ocorrencias && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h4 className="text-sm font-semibold text-foreground">Ocorrências</h4>
              </div>
              <div className="pl-6 p-3 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-sm text-amber-800 whitespace-pre-wrap">{rdo.ocorrencias}</p>
              </div>
            </div>
          )}

          {/* Observações */}
          {rdo.observacoes && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Observações</h4>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed pl-6">
                {rdo.observacoes}
              </p>
            </div>
          )}

          {/* Photos count */}
          {rdo.fotos && rdo.fotos.length > 0 && (
            <p className="text-sm text-muted-foreground pl-6">
              📷 {rdo.fotos.length} fotografia(s) — consulte o separador Fotos.
            </p>
          )}

          {/* Download */}
          <Separator />
          <div className="flex justify-end" onClick={handleDownload}>
            <RDOPdfExport rdo={rdoForPdf as any} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}