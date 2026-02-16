import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface EngagementBudgetModalProps {
  open: boolean;
  onClose: () => void;
}

export function EngagementBudgetModal({ open, onClose }: EngagementBudgetModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-left">
          <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-2">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <DialogTitle>Vamos gerar o primeiro orçamento?</DialogTitle>
          <DialogDescription>
            Já tem uma obra criada! O próximo passo é criar um orçamento para gerir custos e artigos.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            className="flex-1"
            onClick={() => {
              onClose();
              navigate('/orcamentos/criar');
            }}
          >
            Criar Orçamento
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Mais tarde
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
