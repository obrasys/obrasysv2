import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileImage, FolderTree, Boxes, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export type ICFAnalysisMode = 'architectural_to_icf' | 'complete_icf_project' | 'ifc_bim';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obraId?: string | null;
}

const OPTIONS: Array<{
  mode: ICFAnalysisMode;
  title: string;
  description: string;
  icon: typeof FileImage;
  status: 'active' | 'soon' | 'beta';
}> = [
  {
    mode: 'architectural_to_icf',
    title: 'Planta Arquitetónica para ICF',
    description:
      'Use quando possui apenas planta arquitetónica e deseja uma estimativa assistida de panos, materiais e orçamento ICF.',
    icon: FileImage,
    status: 'active',
  },
  {
    mode: 'complete_icf_project',
    title: 'Projeto ICF Completo',
    description:
      'Use quando possui projeto técnico ICF com plantas, cortes, alçados, detalhes, mapa de vãos, fundações e documentação complementar.',
    icon: FolderTree,
    status: 'active',
  },
  {
    mode: 'ifc_bim',
    title: 'Modelo IFC / BIM',
    description:
      'Use quando possui modelo BIM/IFC para análise estrutural completa. Funcionalidade em desenvolvimento.',
    icon: Boxes,
    status: 'soon',
  },
];

export const ICFAnalysisModeSelector = ({ open, onOpenChange, obraId }: Props) => {
  const navigate = useNavigate();

  const handleSelect = (mode: ICFAnalysisMode) => {
    if (mode === 'architectural_to_icf') {
      onOpenChange(false);
      const qs = obraId ? `?obra=${obraId}` : '';
      navigate(`/icf/assistente${qs}`);
      return;
    }
    if (mode === 'complete_icf_project') {
      onOpenChange(false);
      const qs = obraId ? `?obra=${obraId}` : '';
      navigate(`/icf/dossier/novo${qs}`);
      return;
    }
    toast.info('Modelo IFC / BIM', { description: 'Funcionalidade em desenvolvimento.' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Nova Análise ICF
          </DialogTitle>
          <DialogDescription>
            Escolha como deseja iniciar a análise. Pode reaproveitar documentos existentes em qualquer
            momento.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-1 mt-2">
          {OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isActive = opt.status === 'active';
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => handleSelect(opt.mode)}
                disabled={opt.status === 'soon' && opt.mode === 'ifc_bim'}
                className={`group text-left rounded-xl border p-4 transition-all flex items-start gap-4 ${
                  isActive
                    ? 'border-primary/30 hover:border-primary hover:bg-primary/5 cursor-pointer'
                    : 'border-border/60 hover:border-border bg-muted/30 cursor-pointer'
                } ${opt.mode === 'ifc_bim' ? 'opacity-60 !cursor-not-allowed' : ''}`}
              >
                <div
                  className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                    isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{opt.title}</span>
                    {opt.status === 'soon' && (
                      <Badge variant="outline" className="text-[10px]">
                        Em breve
                      </Badge>
                    )}
                    {opt.status === 'active' && (
                      <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                        Disponível
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{opt.description}</p>
                </div>
                {isActive && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground italic pt-2">
          Todas as análises geradas pela Axia são estimativas assistidas e devem ser validadas por
          responsável técnico antes da execução ou envio para orçamento.
        </p>
      </DialogContent>
    </Dialog>
  );
};
