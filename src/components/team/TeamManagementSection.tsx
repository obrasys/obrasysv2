import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MembersTable } from './MembersTable';
import { InvitationsTable } from './InvitationsTable';
import { AccessProfilesPanel } from './AccessProfilesPanel';
import { AddCollaboratorModal } from './AddCollaboratorModal';
import { EditPermissionsModal } from './EditPermissionsModal';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { UpgradePromptModal } from '@/components/subscription/UpgradePromptModal';
import { useAuth } from '@/contexts/AuthContext';
import type { TeamMember, TeamInvitation } from '@/types/team';
import { UserPlus, Users, Mail, Shield, Loader2 } from 'lucide-react';

export function TeamManagementSection() {
  const { user } = useAuth();
  const { tier, limits } = useFeatureGate();
  const isRestricted = tier === 'trial' || tier === 'starter';

  const {
    members, membersLoading, invitations, invitationsLoading, obras,
    createInvitation, revokeInvitation, resendInvitation,
    updateMemberStatus, removeMember, updateMemberPermissions,
  } = useTeamManagement();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editPermsOpen, setEditPermsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'reactivate' | 'remove' | 'revoke';
    target: TeamMember | TeamInvitation;
  } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const pendingInvites = invitations.filter(i => i.status === 'pending');

  const handleAddClick = () => {
    if (isRestricted) {
      setShowUpgradeModal(true);
    } else {
      setAddModalOpen(true);
    }
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    const { type, target } = confirmAction;
    if (type === 'suspend') {
      updateMemberStatus.mutate({ memberId: (target as TeamMember).id, status: 'suspended' });
    } else if (type === 'reactivate') {
      updateMemberStatus.mutate({ memberId: (target as TeamMember).id, status: 'active' });
    } else if (type === 'remove') {
      removeMember.mutate((target as TeamMember).id);
    } else if (type === 'revoke') {
      revokeInvitation.mutate((target as TeamInvitation).id);
    }
    setConfirmAction(null);
  };

  if (membersLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Gestão de Equipa</h3>
          <p className="text-sm text-muted-foreground">
            Adicione colaboradores à sua conta para gerir obras em conjunto.
          </p>
        </div>
        <Button onClick={handleAddClick} className="shrink-0">
          <UserPlus className="h-4 w-4 mr-2" />
          Adicionar Colaborador
          {isRestricted && <Badge variant="secondary" className="ml-2 text-[10px]">PRO</Badge>}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: 'Membros ativos', value: members.filter(m => m.member_status === 'active').length, color: 'text-emerald-600' },
          { icon: Mail, label: 'Convites pendentes', value: pendingInvites.length, color: 'text-primary' },
          { icon: Shield, label: 'Perfis de acesso', value: 5, color: 'text-blue-600' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="membros">
        <TabsList>
          <TabsTrigger value="membros" className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Membros
            <Badge variant="secondary" className="text-[10px] ml-1">{members.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="convites" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Convites
            {pendingInvites.length > 0 && (
              <Badge className="text-[10px] ml-1 bg-amber-500">{pendingInvites.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="perfis" className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Perfis de Acesso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="membros">
          <MembersTable
            members={members}
            currentUserId={user?.id || ''}
            onEditPermissions={(m) => { setEditMember(m); setEditPermsOpen(true); }}
            onSuspend={(m) => setConfirmAction({ type: 'suspend', target: m })}
            onReactivate={(m) => setConfirmAction({ type: 'reactivate', target: m })}
            onRemove={(m) => setConfirmAction({ type: 'remove', target: m })}
          />
        </TabsContent>

        <TabsContent value="convites">
          <InvitationsTable
            invitations={invitations}
            onResend={(inv) => resendInvitation.mutate(inv)}
            onRevoke={(inv) => setConfirmAction({ type: 'revoke', target: inv })}
          />
        </TabsContent>

        <TabsContent value="perfis">
          <AccessProfilesPanel />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddCollaboratorModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        obras={obras}
        onSubmit={(data) => {
          createInvitation.mutate(data);
          setAddModalOpen(false);
        }}
        isPending={createInvitation.isPending}
      />

      <EditPermissionsModal
        open={editPermsOpen}
        onOpenChange={setEditPermsOpen}
        member={editMember}
        obras={obras}
        onSave={(data) => {
          updateMemberPermissions.mutate(data);
          setEditPermsOpen(false);
        }}
        isPending={updateMemberPermissions.isPending}
      />

      {/* Confirm Dialogs */}
      <ConfirmActionDialog
        open={confirmAction?.type === 'suspend'}
        onOpenChange={() => setConfirmAction(null)}
        title="Suspender Membro"
        description={`Tem certeza que deseja suspender o acesso de ${(confirmAction?.target as TeamMember)?.nome || ''}? O membro não poderá aceder à plataforma até ser reativado.`}
        confirmLabel="Suspender"
        onConfirm={handleConfirmAction}
        isPending={updateMemberStatus.isPending}
      />
      <ConfirmActionDialog
        open={confirmAction?.type === 'reactivate'}
        onOpenChange={() => setConfirmAction(null)}
        title="Reativar Membro"
        description={`Reativar o acesso de ${(confirmAction?.target as TeamMember)?.nome || ''}?`}
        confirmLabel="Reativar"
        variant="default"
        onConfirm={handleConfirmAction}
        isPending={updateMemberStatus.isPending}
      />
      <ConfirmActionDialog
        open={confirmAction?.type === 'remove'}
        onOpenChange={() => setConfirmAction(null)}
        title="Remover Membro"
        description={`Tem certeza que deseja remover ${(confirmAction?.target as TeamMember)?.nome || ''} da equipa? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        onConfirm={handleConfirmAction}
        isPending={removeMember.isPending}
      />
      <ConfirmActionDialog
        open={confirmAction?.type === 'revoke'}
        onOpenChange={() => setConfirmAction(null)}
        title="Revogar Convite"
        description={`Revogar o convite enviado para ${(confirmAction?.target as TeamInvitation)?.email || ''}?`}
        confirmLabel="Revogar"
        onConfirm={handleConfirmAction}
        isPending={revokeInvitation.isPending}
      />

      <UpgradePromptModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Gestão de Equipa - Plano Professional"
        description="Para adicionar colaboradores e gerir permissões, faça upgrade para o plano Professional que inclui até 10 utilizadores."
        requiredPlan="Professional"
        currentTier={tier}
        usage={{
          label: 'Utilizadores',
          current: members.length + pendingInvites.length,
          limit: limits.maxUtilizadores || '∞',
        }}
      />
    </div>
  );
}
