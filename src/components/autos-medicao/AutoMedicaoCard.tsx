import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AutoMedicaoStatusBadge } from './AutoMedicaoStatusBadge';
import { useFormatting } from '@/hooks/useFormatting';
import { Calendar, MapPin, User, FileText, Eye, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AutoMedicao } from '@/types/autos-medicao';

interface AutoMedicaoCardProps {
  auto: AutoMedicao;
  onDelete?: (id: string) => void;
}

export function AutoMedicaoCard({ auto, onDelete }: AutoMedicaoCardProps) {
  const { formatCurrency, formatDate } = useFormatting();

  const percentagem = auto.percentagem_global || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Auto nº {auto.numero_auto}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {auto.obra?.nome || 'Obra não especificada'}
            </p>
          </div>
          <AutoMedicaoStatusBadge estado={auto.estado} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(auto.data_inicio)} - {formatDate(auto.data_fim)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{auto.responsavel_medicao}</span>
          </div>
          {auto.zona_medicao && (
            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
              <MapPin className="h-4 w-4" />
              <span>{auto.zona_medicao}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{percentagem.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(percentagem, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Medido Atual</p>
            <p className="font-semibold">{formatCurrency(auto.valor_medido_atual || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total c/ IVA</p>
            <p className="font-semibold text-primary">{formatCurrency(auto.valor_total_com_iva || 0)}</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link to={`/autos-medicao/${auto.id}`}>
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link to={`/autos-medicao/${auto.id}/editar`}>
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Link>
          </Button>
          {onDelete && auto.estado === 'rascunho' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onDelete(auto.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
