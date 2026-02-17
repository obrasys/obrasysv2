import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';

interface Props {
  open: boolean;
  onStart: () => void;
  onExplore: () => void;
}

export function OnboardingWelcomeModal({ open, onStart, onExplore }: Props) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center mb-2">
            <Rocket className="w-7 h-7 text-accent" />
          </div>
          <DialogTitle className="text-xl">Bem-vindo ao Obra Sys</DialogTitle>
          <DialogDescription className="text-base leading-relaxed mt-3">
            Organize a sua próxima obra em menos de 5 minutos.{' '}
            <span className="text-foreground font-medium">Sem Excel. Sem confusão. Sem perder controlo financeiro.</span>
            <br /><br />
            Vamos guiá-lo passo a passo até ter a sua primeira obra estruturada.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2 mt-2">
          <Button onClick={onStart} className="w-full">
            Começar agora
          </Button>
          <Button variant="ghost" onClick={onExplore} className="w-full text-muted-foreground">
            Prefiro explorar sozinho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
