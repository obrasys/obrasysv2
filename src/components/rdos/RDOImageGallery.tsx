import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Image as ImageIcon, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
} from 'lucide-react';

interface RDOImageGalleryProps {
  photos: string[];
}

export function RDOImageGallery({ photos }: RDOImageGalleryProps) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadSignedUrls = async () => {
      if (photos.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const urls: Record<string, string> = {};

      for (const path of photos) {
        const { data } = await supabase.storage
          .from('rdo-fotos')
          .createSignedUrl(path, 3600);
        
        if (data?.signedUrl) {
          urls[path] = data.signedUrl;
        }
      }

      setSignedUrls(urls);
      setLoading(false);
    };

    loadSignedUrls();
  }, [photos]);

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const handleDownload = async () => {
    const url = signedUrls[photos[selectedIndex]];
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `foto-rdo-${selectedIndex + 1}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (photos.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Thumbnails Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((path, index) => (
          <Dialog 
            key={path} 
            open={isOpen && selectedIndex === index}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (open) setSelectedIndex(index);
            }}
          >
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-0">
                  {signedUrls[path] ? (
                    <img
                      src={signedUrls[path]}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-24 sm:h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-24 sm:h-32 flex items-center justify-center bg-muted">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
              <div className="relative">
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>

                {/* Download button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-12 z-10 text-white hover:bg-white/20"
                  onClick={handleDownload}
                >
                  <Download className="h-5 w-5" />
                </Button>

                {/* Navigation */}
                {photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-10 w-10"
                      onClick={handlePrevious}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-10 w-10"
                      onClick={handleNext}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}

                {/* Image */}
                <div className="flex items-center justify-center min-h-[300px] max-h-[80vh]">
                  {signedUrls[photos[selectedIndex]] ? (
                    <img
                      src={signedUrls[photos[selectedIndex]]}
                      alt={`Foto ${selectedIndex + 1}`}
                      className="max-w-full max-h-[80vh] object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>

                {/* Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                  {selectedIndex + 1} / {photos.length}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}
