import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Camera, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface RDO {
  id: string;
  data: string;
  fotos: string[] | null;
}

interface PortalPhotoGalleryProps {
  rdos: RDO[];
  onLogEvent: (eventType: string, entityType?: string, entityId?: string) => void;
}

interface PhotoItem {
  path: string;
  signedUrl: string | null;
  rdoDate: string;
  rdoId: string;
}

export function PortalPhotoGallery({ rdos, onLogEvent }: PortalPhotoGalleryProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  useEffect(() => {
    const loadPhotos = async () => {
      setLoading(true);
      const allPhotos: PhotoItem[] = [];

      for (const rdo of rdos) {
        if (!rdo.fotos || rdo.fotos.length === 0) continue;

        for (const path of rdo.fotos) {
          let signedUrl: string | null = null;
          if (path.startsWith('http')) {
            signedUrl = path;
          } else {
            const { data } = await supabase.storage
              .from('rdo-fotos')
              .createSignedUrl(path, 3600);
            signedUrl = data?.signedUrl || null;
          }
          allPhotos.push({ path, signedUrl, rdoDate: rdo.data, rdoId: rdo.id });
        }
      }

      setPhotos(allPhotos);
      setLoading(false);
    };

    loadPhotos();
  }, [rdos]);

  const handleOpenPhoto = (photo: PhotoItem) => {
    setSelectedPhoto(photo);
    onLogEvent('photo_open', 'photo', photo.path);
  };

  // Group by date
  const grouped = photos.reduce<Record<string, PhotoItem[]>>((acc, p) => {
    const dateKey = p.rdoDate;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(p);
    return acc;
  }, {});

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-5 w-5 text-primary" />
            Fotografias da Obra
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">A carregar fotos...</p>
          ) : photos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Ainda não existem fotografias disponíveis.
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .map(([date, items]) => (
                  <div key={date}>
                    <p className="text-sm font-medium text-foreground mb-2">
                      {format(new Date(date), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {items.map((photo, idx) =>
                        photo.signedUrl ? (
                          <div
                            key={idx}
                            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-border"
                            onClick={() => handleOpenPhoto(photo)}
                          >
                            <img
                              src={photo.signedUrl}
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div
                            key={idx}
                            className="aspect-square rounded-lg bg-muted flex items-center justify-center border border-border"
                          >
                            <Camera className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      {selectedPhoto && selectedPhoto.signedUrl && (
        <Dialog open onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 z-10 text-white/80 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="flex items-center justify-center min-h-[60vh]">
              <img
                src={selectedPhoto.signedUrl}
                alt="Foto ampliada"
                className="max-w-full max-h-[85vh] object-contain"
              />
            </div>
            <p className="text-center text-white/60 text-sm pb-3">
              {format(new Date(selectedPhoto.rdoDate), "d 'de' MMMM 'de' yyyy", { locale: pt })}
            </p>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
