import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, CheckCircle2, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { ChecklistConformidade, ChecklistItem } from '@/types/conformidade';
import { CHECKLIST_STATUS_CONFIG } from '@/types/conformidade';

interface ChecklistCardProps {
  checklist: ChecklistConformidade;
  onEdit: (checklist: ChecklistConformidade) => void;
  onDelete: (id: string) => void;
  onUpdateItems: (id: string, itens: ChecklistItem[]) => void;
}

export function ChecklistCard({ checklist, onEdit, onDelete, onUpdateItems }: ChecklistCardProps) {
  const [localItens, setLocalItens] = useState<ChecklistItem[]>(checklist.itens);
  
  const statusConfig = CHECKLIST_STATUS_CONFIG[checklist.status];
  const completedCount = localItens.filter(i => i.concluido).length;
  const totalCount = localItens.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleItemToggle = (itemId: string) => {
    const updatedItens = localItens.map(item =>
      item.id === itemId ? { ...item, concluido: !item.concluido } : item
    );
    setLocalItens(updatedItens);
    onUpdateItems(checklist.id, updatedItens);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{checklist.titulo}</CardTitle>
            {checklist.obra && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                {checklist.obra.nome}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
              {statusConfig.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => onEdit(checklist)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(checklist.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {checklist.descricao && (
          <p className="text-sm text-muted-foreground">{checklist.descricao}</p>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{completedCount}/{totalCount}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Checklist Items */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {localItens.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={item.id}
                checked={item.concluido}
                onCheckedChange={() => handleItemToggle(item.id)}
                className="mt-0.5"
              />
              <label
                htmlFor={item.id}
                className={`text-sm cursor-pointer flex-1 ${
                  item.concluido ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {item.descricao}
              </label>
            </div>
          ))}
          {localItens.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum item na checklist
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <span>
            Criada em {format(new Date(checklist.created_at), "dd MMM yyyy", { locale: pt })}
          </span>
          {checklist.responsavel && (
            <span>Responsável: {checklist.responsavel.nome}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
