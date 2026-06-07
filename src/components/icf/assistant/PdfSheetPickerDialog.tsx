import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText } from 'lucide-react';
import { renderPdfThumbnails } from '@/lib/pdf-to-image';

interface Props {
  file: File | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (pages: number[]) => void;
  isProcessing?: boolean;
}

/**
 * Lets the user choose which sheet(s) of a multi-page PDF to import as ICF
 * assistant sessions. Each selected page becomes one independent session
 * (typically one per floor / specialty sheet of a complete project).
 */
export function PdfSheetPickerDialog({ file, open, onOpenChange, onConfirm, isProcessing }: Props) {
  const [thumbs, setThumbs] = useState<Array<{ pageNum: number; dataUrl: string }>>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set([1]));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !file) return;
    let cancelled = false;
    setLoading(true);
    setThumbs([]);
    setSelected(new Set([1]));
    renderPdfThumbnails(file, { scale: 0.35 })
      .then((t) => { if (!cancelled) setThumbs(t); })
      .catch(() => { /* swallow - user can still confirm page 1 */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, file]);

  const toggle = (n: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      if (next.size === 0) next.add(n);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(thumbs.map((t) => t.pageNum)));
  const clearAll = () => setSelected(new Set([1]));

  const handleConfirm = () => {
    const pages = Array.from(selected).sort((a, b) => a - b);
    onConfirm(pages);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Selecionar folhas do projeto
          </DialogTitle>
          <DialogDescription>
            O PDF tem várias folhas. Escolha que folhas pretende importar - cada folha selecionada
            cria uma sessão própria do assistente (ex: piso 0, piso 1, cobertura).
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A preparar pré-visualizações…
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {thumbs.length} folhas detetadas · {selected.size} selecionadas
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={selectAll} disabled={thumbs.length === 0}>
                  Selecionar todas
                </Button>
                <Button size="sm" variant="ghost" onClick={clearAll} disabled={thumbs.length === 0}>
                  Limpar
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {thumbs.map((t) => {
                const isSel = selected.has(t.pageNum);
                return (
                  <button
                    type="button"
                    key={t.pageNum}
                    onClick={() => toggle(t.pageNum)}
                    className={`relative rounded-lg border p-2 transition-all text-left ${
                      isSel ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-muted/40 rounded overflow-hidden flex items-center justify-center">
                      <img src={t.dataUrl} alt={`Folha ${t.pageNum}`} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-medium">Folha {t.pageNum}</span>
                      <Checkbox checked={isSel} onCheckedChange={() => toggle(t.pageNum)} />
                    </div>
                    {isSel && (
                      <Badge className="absolute top-1 left-1 text-[10px]" variant="default">selecionada</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading || isProcessing || selected.size === 0}>
            {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Importar {selected.size} folha{selected.size > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
