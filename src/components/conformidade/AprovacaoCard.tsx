import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Aprovacao, AprovacaoStatus } from '@/types/conformidade';
import { APROVACAO_STATUS_CONFIG, APROVACAO_TIPO_CONFIG } from '@/types/conformidade';

interface AprovacaoCardProps {
  aprovacao: Aprovacao;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function AprovacaoCard({ aprovacao, onApprove, onReject }: AprovacaoCardProps) {
  const statusConfig = APROVACAO_STATUS_CONFIG[aprovacao.status];
  const tipoConfig = APROVACAO_TIPO_CONFIG[aprovacao.tipo];
  const isPending = aprovacao.status === 'pendente';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{tipoConfig.label}</Badge>
              <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                {aprovacao.status === 'pendente' && <Clock className="w-3 h-3 mr-1" />}
                {aprovacao.status === 'aprovado' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {aprovacao.status === 'rejeitado' && <XCircle className="w-3 h-3 mr-1" />}
                {statusConfig.label}
              </Badge>
            </div>

            {/* People */}
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              {aprovacao.solicitante && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Solicitante</p>
                    <p className="font-medium">{aprovacao.solicitante.nome}</p>
                  </div>
                </div>
              )}
              {aprovacao.aprovador && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Aprovador</p>
                    <p className="font-medium">{aprovacao.aprovador.nome}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Comments */}
            {aprovacao.comentarios && (
              <div className="flex items-start gap-2 mt-3 p-2 bg-muted rounded-lg">
                <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                <p className="text-sm">{aprovacao.comentarios}</p>
              </div>
            )}

            {/* Dates */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Solicitado: {format(new Date(aprovacao.data_solicitacao), "dd/MM/yyyy HH:mm", { locale: pt })}
              </div>
              {aprovacao.data_aprovacao && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Processado: {format(new Date(aprovacao.data_aprovacao), "dd/MM/yyyy HH:mm", { locale: pt })}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {isPending && (
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => onApprove(aprovacao.id)}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onReject(aprovacao.id)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejeitar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
