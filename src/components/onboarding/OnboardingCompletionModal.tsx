import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OnboardingCompletionModal({ open, onClose }: Props) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/50">
        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

        <div className="px-8 pt-8 pb-7 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
            className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5"
          >
            <Sparkles className="w-6 h-6 text-primary" />
          </motion.div>

          <h2 className="font-display text-xl font-bold text-foreground tracking-tight">
            Está pronto para gerir como um profissional
          </h2>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-sm mx-auto">
            A sua obra está estruturada com orçamento, equipa e registos ativos.
            Acompanhe evolução e custos em tempo real.
          </p>

          <div className="flex flex-col gap-2 mt-7">
            <Button
              onClick={() => { onClose(); navigate('/relatorios'); }}
              className="w-full gap-2 bg-primary hover:bg-primary/90 shadow-sm shadow-primary/15 font-semibold"
            >
              Ver Relatório da Obra
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => { onClose(); navigate('/definicoes'); }}
              className="w-full text-muted-foreground text-xs"
            >
              Explorar funcionalidades avançadas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
