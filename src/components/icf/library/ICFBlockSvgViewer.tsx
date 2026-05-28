import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';

interface Props {
  src: string;
  alt: string;
  className?: string;
  /** Mostrar botão flutuante para abrir em modal */
  showZoom?: boolean;
}

/**
 * Renderiza um SVG como asset estático (via <img>) - não executa scripts embutidos.
 */
export const ICFBlockSvgViewer = ({ src, alt, className, showZoom = true }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`relative bg-muted/30 rounded-lg overflow-hidden ${className ?? ''}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-contain p-2"
      />
      {showZoom && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-2 right-2 h-7 w-7 opacity-80 hover:opacity-100"
          onClick={() => setOpen(true)}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{alt}</DialogTitle>
          </DialogHeader>
          <div className="bg-white rounded-lg p-4 max-h-[80vh] overflow-auto">
            <img src={src} alt={alt} className="w-full h-auto" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
