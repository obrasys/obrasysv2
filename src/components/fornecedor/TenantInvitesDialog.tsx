import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Loader2, Mail, RefreshCcw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useTenantSupplierInvites,
  useCancelTenantSupplierInvite,
  useResendTenantSupplierInvite,
} from '@/hooks/useTenantSupplierInvites';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABEL: Record<string, { label: string; variant: any }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  accepted: { label: 'Aceite', variant: 'default' },
  expired: { label: 'Expirado', variant: 'outline' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
};

export function TenantInvitesDialog({ open, onOpenChange }: Props) {
  const { data: invites, isLoading } = useTenantSupplierInvites();
  const cancel = useCancelTenantSupplierInvite();
  const resend = useResendTenantSupplierInvite();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convites a fornecedores</DialogTitle>
          <DialogDescription>
            Convites enviados a partir desta empresa. Só são visíveis aqui.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !invites || invites.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Ainda não enviou nenhum convite.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invites.map((inv) => {
              const status = STATUS_LABEL[inv.status] || STATUS_LABEL.pending;
              return (
                <div
                  key={inv.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">
                        {inv.nome_fornecedor || inv.email}
                      </p>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{inv.email}</p>
                    {inv.categoria && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Categoria: {inv.categoria}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Enviado em{' '}
                      {format(new Date(inv.created_at), "d 'de' MMM yyyy", { locale: pt })}
                      {inv.status === 'pending' && (
                        <>
                          {' · expira em '}
                          {format(new Date(inv.expires_at), "d 'de' MMM yyyy", { locale: pt })}
                        </>
                      )}
                      {inv.status === 'accepted' && inv.accepted_at && (
                        <>
                          {' · aceite em '}
                          {format(new Date(inv.accepted_at), "d 'de' MMM yyyy", {
                            locale: pt,
                          })}
                        </>
                      )}
                    </p>
                  </div>
                  {inv.status === 'pending' && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resend.mutate(inv.id)}
                        disabled={resend.isPending}
                        title="Reenviar email"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancel.mutate(inv.id)}
                        disabled={cancel.isPending}
                        title="Cancelar convite"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
