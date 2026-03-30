import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Search, Eye, Cloud, Sun, CloudRain, CloudSnow, Users, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
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

const weatherIcons: Record<string, { icon: React.ReactNode; label: string }> = {
  limpo: { icon: <Sun className="h-4 w-4 text-amber-500" />, label: 'Limpo' },
  nublado: { icon: <Cloud className="h-4 w-4 text-muted-foreground" />, label: 'Nublado' },
  chuva: { icon: <CloudRain className="h-4 w-4 text-blue-500" />, label: 'Chuva' },
  neve: { icon: <CloudSnow className="h-4 w-4 text-blue-300" />, label: 'Neve' },
};

export function PortalRDOList({ rdos, obraNome, onLogEvent }: PortalRDOListProps) {
  const [search, setSearch] = useState('');
  const [selectedRDO, setSelectedRDO] = useState<RDO | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  // Pre-load first thumbnail for each RDO
  useEffect(() => {
    const loadThumbnails = async () => {
      const thumbs: Record<string, string> = {};
      for (const rdo of rdos) {
        if (!rdo.fotos || rdo.fotos.length === 0) continue;
        const firstPhoto = rdo.fotos[0];
        if (firstPhoto.startsWith('http')) {
          thumbs[rdo.id] = firstPhoto;
        } else {
          const { data } = await supabase.storage
            .from('rdo-fotos')
            .createSignedUrl(firstPhoto, 3600);
          if (data?.signedUrl) thumbs[rdo.id] = data.signedUrl;
        }
      }
      setThumbnails(thumbs);
    };
    loadThumbnails();
  }, [rdos]);

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
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por data ou conteúdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>

        {filtered.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="py-10 text-center">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhum relatório encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((rdo) => {
              const weather = weatherIcons[rdo.condicoes_meteorologicas || ''];
              const isAprovado = rdo.status === 'aprovado';
              const thumb = thumbnails[rdo.id];
              const photoCount = rdo.fotos?.length || 0;

              return (
                <Card
                  key={rdo.id}
                  className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => handleOpenRDO(rdo)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Date circle */}
                      <div className="h-12 w-12 rounded-xl bg-primary/5 flex flex-col items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-primary leading-none">
                          {format(new Date(rdo.data), 'dd')}
                        </span>
                        <span className="text-[10px] text-primary/70 uppercase">
                          {format(new Date(rdo.data), 'MMM', { locale: pt })}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-foreground capitalize">
                            {format(new Date(rdo.data), 'EEEE', { locale: pt })}
                          </p>
                          {weather && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              {weather.icon}
                              <span className="hidden sm:inline">{weather.label}</span>
                            </span>
                          )}
                        </div>
                        {rdo.trabalhos_executados && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {rdo.trabalhos_executados}
                          </p>
                        )}
                        {/* Meta row */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {rdo.mao_de_obra_presente != null && rdo.mao_de_obra_presente > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {rdo.mao_de_obra_presente}
                            </span>
                          )}
                          {photoCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Camera className="h-3 w-3" />
                              {photoCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Thumbnail */}
                      {thumb && (
                        <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0 border border-border">
                          <img
                            src={thumb}
                            alt="Foto"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Status + Action */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge
                          variant="secondary"
                          className={`text-[11px] ${
                            isAprovado ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          {isAprovado ? 'Aprovado' : 'Submetido'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
