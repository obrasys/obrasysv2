import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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

  const handleOpenPhoto = (index: number) => {
    setSelectedIndex(index);
    onLogEvent('photo_open', 'photo', photos[index].path);
  };

  const handlePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
  };
  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) setSelectedIndex(selectedIndex + 1);
  };

  // Group by date
  const grouped = photos.reduce<Record<string, PhotoItem[]>>((acc, p) => {
    const dateKey = p.rdoDate;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(p);
    return acc;
  }, {});

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <>
      {loading ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">A carregar fotos...</p>
          </CardContent>
        </Card>
      ) : photos.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-10 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Camera className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Ainda não existem fotografias disponíveis.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {format(new Date(date), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {items.length} foto{items.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {items.map((photo, idx) => {
                    const globalIndex = photos.indexOf(photo);
                    return photo.signedUrl ? (
                      <div
                        key={idx}
                        className="aspect-square rounded-xl overflow-hidden cursor-pointer group relative border border-border"
                        onClick={() => handleOpenPhoto(globalIndex)}
                      >
                        <img
                          src={photo.signedUrl}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                    ) : (
                      <div
                        key={idx}
                        className="aspect-square rounded-xl bg-muted flex items-center justify-center border border-border"
                      >
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Lightbox with navigation */}
      {selectedPhoto && selectedPhoto.signedUrl && (
        <Dialog open onOpenChange={() => setSelectedIndex(null)}>
          <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-3 right-3 z-10 text-white/80 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Navigation */}
            {selectedIndex !== null && selectedIndex > 0 && (
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {selectedIndex !== null && selectedIndex < photos.length - 1 && (
              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center justify-center min-h-[60vh]">
              <img
                src={selectedPhoto.signedUrl}
                alt="Foto ampliada"
                className="max-w-full max-h-[85vh] object-contain"
              />
            </div>
            <div className="text-center pb-3 space-y-1">
              <p className="text-white/60 text-sm">
                {format(new Date(selectedPhoto.rdoDate), "d 'de' MMMM 'de' yyyy", { locale: pt })}
              </p>
              <p className="text-white/40 text-xs">
                {(selectedIndex || 0) + 1} / {photos.length}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}