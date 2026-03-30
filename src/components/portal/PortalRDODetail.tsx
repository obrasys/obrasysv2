import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, Users, Cloud, Sun, CloudRain, AlertTriangle, MessageSquare, FileText, Camera, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
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
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadPhotos = async () => {
      if (!rdo.fotos || rdo.fotos.length === 0) return;
      const urls: string[] = [];
      for (const path of rdo.fotos) {
        if (path.startsWith('http')) {
          urls.push(path);
        } else {
          const { data } = await supabase.storage
            .from('rdo-fotos')
            .createSignedUrl(path, 3600);
          if (data?.signedUrl) urls.push(data.signedUrl);
        }
      }
      setPhotoUrls(urls);
    };
    loadPhotos();
  }, [rdo.fotos]);

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
    <>
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

            {/* Inline Photos */}
            {photoUrls.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">
                    Fotografias ({photoUrls.length})
                  </h4>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pl-6">
                  {photoUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="aspect-square rounded-lg overflow-hidden cursor-pointer border border-border hover:ring-2 hover:ring-primary/30 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(idx);
                        onLogEvent('photo_open', 'photo', rdo.id);
                      }}
                    >
                      <img
                        src={url}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Download */}
            <Separator />
            <div className="flex justify-end" onClick={handleDownload}>
              <RDOPdfExport rdo={rdoForPdf as any} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxIndex !== null && photoUrls[lightboxIndex] && (
        <Dialog open onOpenChange={() => setLightboxIndex(null)}>
          <DialogContent className="max-w-4xl p-0 bg-black/95 border-none [&>button]:hidden">
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-3 right-3 z-10 text-white/80 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            {lightboxIndex > 0 && (
              <button
                onClick={() => setLightboxIndex(lightboxIndex - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {lightboxIndex < photoUrls.length - 1 && (
              <button
                onClick={() => setLightboxIndex(lightboxIndex + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
            <div className="flex items-center justify-center min-h-[60vh]">
              <img
                src={photoUrls[lightboxIndex]}
                alt="Foto ampliada"
                className="max-w-full max-h-[85vh] object-contain"
              />
            </div>
            <div className="text-center pb-3">
              <p className="text-white/40 text-xs">
                {lightboxIndex + 1} / {photoUrls.length}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
