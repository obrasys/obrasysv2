import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { TeamMember, TeamInvitation, InviteFormData, ModulePermission, MemberStatus } from '@/types/team';

export function useTeamManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Get the user's org id
  const orgQuery = useQuery({
    queryKey: ['user-org', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user!.id)
        .limit(1)
        .single();
      if (error) throw error;
      return data.organization_id as string;
    },
    enabled: !!user,
  });

  const orgId = orgQuery.data;

  // Fetch members
  const membersQuery = useQuery({
    queryKey: ['team-members', orgId],
    queryFn: async (): Promise<TeamMember[]> => {
      // Get org members with profiles
      const { data: members, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, member_status, job_title, obra_scope, last_seen_at, invited_by')
        .eq('organization_id', orgId!);
      if (error) throw error;
      if (!members?.length) return [];

      // Get profiles for all members
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, nome, email, avatar_url')
        .in('user_id', userIds);

      // Get module permissions
      const memberIds = members.map(m => m.id);
      const { data: perms } = await supabase
        .from('member_module_permissions')
        .select('*')
        .in('member_id', memberIds);

      // Get project access
      const { data: access } = await supabase
        .from('member_project_access')
        .select('member_id, obra_id, access_level')
        .in('member_id', memberIds);

      // Get obra names for project access
      const obraIds = [...new Set((access || []).map(a => a.obra_id))];
      let obraMap: Record<string, string> = {};
      if (obraIds.length) {
        const { data: obras } = await supabase.from('obras').select('id, nome').in('id', obraIds);
        obraMap = Object.fromEntries((obras || []).map(o => [o.id, o.nome]));
      }

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

      return members.map(m => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role as any,
        member_status: (m.member_status || 'active') as any,
        job_title: m.job_title,
        obra_scope: (m.obra_scope || 'all') as any,
        last_seen_at: m.last_seen_at,
        invited_by: m.invited_by,
        nome: profileMap[m.user_id]?.nome || 'Sem nome',
        email: profileMap[m.user_id]?.email || '',
        avatar_url: profileMap[m.user_id]?.avatar_url || null,
        module_permissions: (perms || [])
          .filter(p => p.member_id === m.id)
          .map(p => ({
            module_code: p.module_code as any,
            can_view: p.can_view,
            can_create: p.can_create,
            can_update: p.can_update,
            can_delete: p.can_delete,
          })),
        project_access: (access || [])
          .filter(a => a.member_id === m.id)
          .map(a => ({
            obra_id: a.obra_id,
            obra_nome: obraMap[a.obra_id] || 'Obra',
            access_level: a.access_level as any,
          })),
      }));
    },
    enabled: !!orgId,
  });

  // Fetch invitations
  const invitationsQuery = useQuery({
    queryKey: ['team-invitations', orgId],
    queryFn: async (): Promise<TeamInvitation[]> => {
      const { data: invites, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!invites?.length) return [];

      const inviteIds = invites.map(i => i.id);
      const { data: perms } = await supabase
        .from('team_invitation_module_permissions')
        .select('*')
        .in('invitation_id', inviteIds);

      return invites.map(inv => ({
        ...inv,
        role_code: inv.role_code as any,
        obra_scope: inv.obra_scope as any,
        status: inv.status as any,
        module_permissions: (perms || [])
          .filter(p => p.invitation_id === inv.id)
          .map(p => ({
            module_code: p.module_code as any,
            can_view: p.can_view,
            can_create: p.can_create,
            can_update: p.can_update,
            can_delete: p.can_delete,
          })),
      }));
    },
    enabled: !!orgId,
  });

  // Create invitation + trigger user creation via edge function
  const createInvitation = useMutation({
    mutationFn: async (formData: InviteFormData) => {
      if (!orgId || !user) throw new Error('Sem organização');

      // 1. Create invitation record
      const { data: invite, error: invError } = await supabase
        .from('team_invitations')
        .insert({
          organization_id: orgId,
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || null,
          job_title: formData.job_title || null,
          internal_note: formData.internal_note || null,
          role_code: formData.role_code,
          obra_scope: formData.obra_scope,
          invited_by_user_id: user.id,
        })
        .select()
        .single();
      if (invError) throw invError;

      // 2. Insert module permissions
      if (formData.module_permissions.length > 0) {
        const permRows = formData.module_permissions.map(p => ({
          invitation_id: invite.id,
          module_code: p.module_code,
          can_view: p.can_view,
          can_create: p.can_create,
          can_update: p.can_update,
          can_delete: p.can_delete,
        }));
        await supabase.from('team_invitation_module_permissions').insert(permRows);
      }

      // 3. Call edge function to create user and send email
      // Map role_code to profile role
      const roleMap: Record<string, string> = {
        admin: 'admin', manager: 'gestor', technician: 'fiscal',
        finance: 'financeiro', viewer: 'gestor',
      };
      const profileRole = roleMap[formData.role_code] || 'gestor';

      const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-user-actions', {
        body: {
          action: 'create_user',
          email: formData.email,
          nome: formData.full_name,
          role: profileRole,
          modulePermissions: formData.module_permissions,
          obraScope: formData.obra_scope,
          selectedObras: formData.selected_obras,
          invitationId: invite.id,
        },
      });

      if (fnError) throw fnError;
      return invite;
    },
    onSuccess: () => {
      toast.success('Convite enviado com sucesso!');
      qc.invalidateQueries({ queryKey: ['team-invitations'] });
      qc.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (err: any) => {
      const msg = err?.message || 'Erro ao enviar convite';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.error('Já existe um convite pendente para este email');
      } else {
        toast.error(msg);
      }
    },
  });

  // Revoke invitation
  const revokeInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Convite revogado');
      qc.invalidateQueries({ queryKey: ['team-invitations'] });
    },
  });

  // Resend invitation
  const resendInvitation = useMutation({
    mutationFn: async (invitation: TeamInvitation) => {
      // Update expiry
      await supabase
        .from('team_invitations')
        .update({ expires_at: new Date(Date.now() + 7 * 86400000).toISOString() })
        .eq('id', invitation.id);

      // Trigger email again
      await supabase.functions.invoke('admin-user-actions', {
        body: {
          action: 'send_password_reset',
          email: invitation.email,
        },
      });
    },
    onSuccess: () => {
      toast.success('Convite reenviado');
      qc.invalidateQueries({ queryKey: ['team-invitations'] });
    },
  });

  // Update member status
  const updateMemberStatus = useMutation({
    mutationFn: async ({ memberId, status }: { memberId: string; status: MemberStatus }) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ member_status: status })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(status === 'active' ? 'Membro reativado' : status === 'suspended' ? 'Membro suspenso' : 'Estado atualizado');
      qc.invalidateQueries({ queryKey: ['team-members'] });
    },
  });

  // Remove member
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Membro removido da equipa');
      qc.invalidateQueries({ queryKey: ['team-members'] });
    },
  });

  // Update member permissions
  const updateMemberPermissions = useMutation({
    mutationFn: async ({ memberId, permissions, obraScope, selectedObras }: {
      memberId: string;
      permissions: ModulePermission[];
      obraScope: string;
      selectedObras?: string[];
    }) => {
      // Delete existing permissions
      await supabase.from('member_module_permissions').delete().eq('member_id', memberId);

      // Insert new
      if (permissions.length > 0) {
        const rows = permissions.map(p => ({
          member_id: memberId,
          module_code: p.module_code,
          can_view: p.can_view,
          can_create: p.can_create,
          can_update: p.can_update,
          can_delete: p.can_delete,
        }));
        await supabase.from('member_module_permissions').insert(rows);
      }

      // Update obra_scope
      await supabase.from('organization_members').update({ obra_scope: obraScope }).eq('id', memberId);

      // Update project access if assigned
      if (obraScope === 'assigned' && selectedObras) {
        await supabase.from('member_project_access').delete().eq('member_id', memberId);
        if (selectedObras.length > 0) {
          const accessRows = selectedObras.map(obraId => ({
            member_id: memberId,
            obra_id: obraId,
            access_level: 'full',
          }));
          await supabase.from('member_project_access').insert(accessRows);
        }
      }
    },
    onSuccess: () => {
      toast.success('Permissões atualizadas');
      qc.invalidateQueries({ queryKey: ['team-members'] });
    },
  });

  // Fetch obras for selection
  const obrasQuery = useQuery({
    queryKey: ['team-obras-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obras')
        .select('id, nome, estado')
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  return {
    orgId,
    members: membersQuery.data || [],
    membersLoading: membersQuery.isLoading,
    invitations: invitationsQuery.data || [],
    invitationsLoading: invitationsQuery.isLoading,
    obras: obrasQuery.data || [],
    createInvitation,
    revokeInvitation,
    resendInvitation,
    updateMemberStatus,
    removeMember,
    updateMemberPermissions,
  };
}
