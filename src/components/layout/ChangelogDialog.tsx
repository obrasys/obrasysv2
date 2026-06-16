import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { CHANGELOG } from '@/config/changelog';
import { APP_VERSION } from '@/config/version';

interface ChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangelogDialog({ open, onOpenChange }: ChangelogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Notas de Versão
          </DialogTitle>
          <DialogDescription>
            Histórico de atualizações do ObraSys — versão atual{' '}
            <span className="font-semibold text-foreground">{APP_VERSION}</span>.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] px-6 py-4">
          <ol className="relative border-l border-border ml-3 space-y-6 py-2">
            {CHANGELOG.map((entry) => {
              const isCurrent = entry.version === APP_VERSION;
              return (
                <li key={entry.version} className="ml-6">
                  <span
                    className={`absolute -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-background ${
                      isCurrent ? 'bg-primary' : 'bg-muted-foreground/40'
                    }`}
                  />
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-display text-base font-semibold text-foreground">
                      v{entry.version} — {entry.title}
                    </h3>
                    {isCurrent && (
                      <Badge variant="default" className="text-[10px] uppercase tracking-wide">
                        Atual
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{entry.date}</p>
                  <ul className="space-y-1.5 text-sm text-foreground/90">
                    {entry.highlights.map((h, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary mt-1.5 shrink-0">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
