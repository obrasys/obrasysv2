import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Lock, FileText, Loader2, Settings } from 'lucide-react';

interface Props {
  config: any;
  hasResumo: boolean;
  isGenerating: boolean;
  onChangeStatus: (id: string, status: 'validado' | 'congelado') => void;
  onOpenBudget: () => void;
  onEdit: () => void;
}

const statusVariant = (s: string): 'default' | 'secondary' | 'outline' => {
  if (s === 'congelado') return 'secondary';
  if (s === 'validado') return 'default';
  return 'outline';
};

export const IcfConfigHeader = ({ config, hasResumo, isGenerating, onChangeStatus, onOpenBudget, onEdit }: Props) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-3">
      <div>
        <CardTitle className="text-lg">{config.nome}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Versão {config.versao} · {config.classe_betao} · {config.classe_aco} · Núcleo {config.espessura_nucleo * 100} cm
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={statusVariant(config.status)}>{config.status}</Badge>
        {config.status === 'rascunho' && (
          <Button variant="default" size="sm" onClick={() => onChangeStatus(config.id, 'validado')}>
            <CheckCircle className="h-4 w-4 mr-1" />Validar
          </Button>
        )}
        {config.status === 'validado' && (
          <Button variant="secondary" size="sm" onClick={() => onChangeStatus(config.id, 'congelado')}>
            <Lock className="h-4 w-4 mr-1" />Congelar
          </Button>
        )}
        <Button variant="default" size="sm" onClick={onOpenBudget} disabled={isGenerating || !hasResumo}>
          {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
          Gerar Orçamento
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Settings className="h-4 w-4 mr-1" />Editar
        </Button>
      </div>
    </CardHeader>
  </Card>
);
