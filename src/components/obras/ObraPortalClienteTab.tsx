import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Globe, UserPlus, Loader2, Mail, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ObraPortalClienteTabProps {
  obraId: string;
  obraNome: string;
  clienteNome?: string | null;
  clienteEmail?: string | null;
  clienteId?: string | null;
}

interface ClientAccess {
  id: string;
  client_user_id: string;
  obra_id: string;
  ativo: boolean;
  created_at: string;
  client_email?: string;
  client_name?: string;
}

export function ObraPortalClienteTab({ obraId, obraNome, clienteNome, clienteEmail, clienteId }: ObraPortalClienteTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState(clienteEmail || '');
  const [inviteName, setInviteName] = useState(clienteNome || '');
  const [isInviting, setIsInviting] = useState(false);

  const { data: accessList, isLoading } = useQuery({
    queryKey: ['client-obra-access', obraId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('client_obra_access')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ClientAccess[];
    },
  });

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({ variant: 'destructive', title: 'Email obrigatório' });
      return;
    }

    setIsInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-client-portal-access', {
        body: {
          obra_id: obraId,
          client_email: inviteEmail.trim(),
          client_name: inviteName.trim() || undefined,
        },
      });

      if (error) throw error;

      toast({
        title: 'Convite enviado',
        description: `Acesso ao portal concedido a ${inviteEmail}`,
      });

      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      queryClient.invalidateQueries({ queryKey: ['client-obra-access', obraId] });
    } catch (err) {
      console.error('Error inviting client:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao convidar',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const toggleAccess = useMutation({
    mutationFn: async ({ accessId, ativo }: { accessId: string; ativo: boolean }) => {
      const { error } = await (supabase as any)
        .from('client_obra_access')
        .update({ ativo })
        .eq('id', accessId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-obra-access', obraId] });
      toast({ title: 'Acesso atualizado' });
    },
  });

  const activeClients = accessList?.filter(a => a.ativo) || [];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Portal do Cliente
            {activeClients.length > 0 && (
              <Badge variant="secondary" className="ml-2">{activeClients.length}</Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={() => {
            setInviteEmail(clienteEmail || '');
            setInviteName(clienteNome || '');
            setInviteOpen(true);
          }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar Cliente
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : accessList && accessList.length > 0 ? (
            <div className="space-y-3">
              {accessList.map((access) => (
                <div
                  key={access.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${access.ativo ? 'bg-green-100' : 'bg-muted'}`}>
                      {access.ativo ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {access.client_name || access.client_email || 'Cliente'}
                      </p>
                      {access.client_email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {access.client_email}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Convidado em {new Date(access.created_at).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAccess.mutate({ accessId: access.id, ativo: !access.ativo })}
                  >
                    {access.ativo ? 'Desativar' : 'Reativar'}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum cliente com acesso ao portal.</p>
              <p className="text-sm mt-1">Convide o cliente para acompanhar o progresso da obra.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setInviteEmail(clienteEmail || '');
                  setInviteName(clienteNome || '');
                  setInviteOpen(true);
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar Primeiro Cliente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Cliente para o Portal</DialogTitle>
            <DialogDescription>
              O cliente receberá um email com as credenciais de acesso ao portal de acompanhamento da obra "{obraNome}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nome do Cliente</Label>
              <Input
                id="client-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Email do Cliente *</Label>
              <Input
                id="client-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="cliente@email.com"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
              {isInviting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
