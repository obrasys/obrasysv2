import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PartyPopper } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OnboardingCompletionModal({ open, onClose }: Props) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mb-2">
            <PartyPopper className="w-7 h-7 text-green-600" />
          </div>
          <DialogTitle className="text-xl">
            Parabéns. Já está a gerir como um profissional.
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed mt-3">
            A sua obra está estruturada, com orçamento, equipa e registos ativos.
            Agora pode acompanhar evolução, controlar custos e gerar relatórios sempre que precisar.
            <br /><br />
            O Obra Sys foi feito para simplificar o seu dia a dia na obra.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2 mt-2">
          <Button onClick={() => { onClose(); navigate('/relatorios'); }} className="w-full">
            Ver Relatório da Obra
          </Button>
          <Button variant="ghost" onClick={() => { onClose(); navigate('/definicoes'); }} className="w-full text-muted-foreground">
            Explorar Funcionalidades Avançadas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
