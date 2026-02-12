import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Search, Download, Eye, Cloud, Sun, CloudRain } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { PortalRDODetail } from './PortalRDODetail';

interface RDO {
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
}

interface PortalRDOListProps {
  rdos: RDO[];
  obraId: string;
  obraNome: string;
  onLogEvent: (eventType: string, entityType?: string, entityId?: string) => void;
}

const weatherIcons: Record<string, React.ReactNode> = {
  limpo: <Sun className="h-4 w-4 text-yellow-500" />,
  nublado: <Cloud className="h-4 w-4 text-muted-foreground" />,
  chuva: <CloudRain className="h-4 w-4 text-blue-500" />,
};

export function PortalRDOList({ rdos, obraNome, onLogEvent }: PortalRDOListProps) {
  const [search, setSearch] = useState('');
  const [selectedRDO, setSelectedRDO] = useState<RDO | null>(null);

  const filtered = rdos.filter((rdo) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      rdo.trabalhos_executados?.toLowerCase().includes(term) ||
      rdo.ocorrencias?.toLowerCase().includes(term) ||
      format(new Date(rdo.data), 'dd/MM/yyyy').includes(term)
    );
  });

  const handleOpenRDO = (rdo: RDO) => {
    setSelectedRDO(rdo);
    onLogEvent('rdo_open', 'rdo', rdo.id);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-primary" />
              Relatórios Diários de Obra
            </CardTitle>
            <Badge variant="secondary">{rdos.length} RDOs</Badge>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por data ou conteúdo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum RDO encontrado.
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((rdo) => (
                <div
                  key={rdo.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {weatherIcons[rdo.condicoes_meteorologicas || ''] || (
                        <Cloud className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(rdo.data), "EEEE, d 'de' MMMM", { locale: pt })}
                      </p>
                      {rdo.trabalhos_executados && (
                        <p className="text-xs text-muted-foreground truncate">
                          {rdo.trabalhos_executados.substring(0, 80)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <Badge
                      variant="secondary"
                      className={
                        rdo.status === 'aprovado'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }
                    >
                      {rdo.status === 'aprovado' ? 'Aprovado' : 'Submetido'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenRDO(rdo)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRDO && (
        <PortalRDODetail
          rdo={selectedRDO}
          obraNome={obraNome}
          onClose={() => setSelectedRDO(null)}
          onLogEvent={onLogEvent}
        />
      )}
    </>
  );
}
