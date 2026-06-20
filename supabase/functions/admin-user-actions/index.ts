import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const mapRoleToProfileRole = (roleCode?: string | null) => {
  switch (roleCode) {
    case "admin":
      return "admin";
    case "manager":
      return "gestor";
    case "technician":
      return "fiscal";
    case "finance":
      return "financeiro";
    case "viewer":
      return "gestor";
    default:
      return roleCode || "gestor";
  }
};

const isEmailExistsError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "email_exists";

async function syncMemberPermissions(serviceClient: any, memberId: string, modulePermissions?: any[]) {
  if (!Array.isArray(modulePermissions)) return;

  const { error: deleteError } = await serviceClient
    .from("member_module_permissions")
    .delete()
    .eq("member_id", memberId);

  if (deleteError) throw deleteError;
  if (modulePermissions.length === 0) return;

  const permissionRows = modulePermissions.map((permission: any) => ({
    member_id: memberId,
    module_code: permission.module_code,
    can_view: permission.can_view ?? false,
    can_create: permission.can_create ?? false,
    can_update: permission.can_update ?? false,
    can_delete: permission.can_delete ?? false,
  }));

  const { error: upsertError } = await serviceClient
    .from("member_module_permissions")
    .upsert(permissionRows, { onConflict: "member_id,module_code" });

  if (upsertError) throw upsertError;
}

async function syncMemberProjectAccess(
  serviceClient: any,
  memberId: string,
  obraScope?: string,
  selectedObras?: string[],
) {
  if (!obraScope) return;

  if (obraScope !== "assigned") {
    const { error: deleteError } = await serviceClient
      .from("member_project_access")
      .delete()
      .eq("member_id", memberId);

    if (deleteError) throw deleteError;
    return;
  }

  if (!Array.isArray(selectedObras)) return;

  const { error: deleteError } = await serviceClient
    .from("member_project_access")
    .delete()
    .eq("member_id", memberId);

  if (deleteError) throw deleteError;
  if (selectedObras.length === 0) return;

  const accessRows = selectedObras.map((obraId: string) => ({
    member_id: memberId,
    obra_id: obraId,
    access_level: "full",
  }));

  const { error: upsertError } = await serviceClient
    .from("member_project_access")
    .upsert(accessRows, { onConflict: "member_id,obra_id" });

  if (upsertError) throw upsertError;
}

async function markInvitationAccepted(serviceClient: any, invitationId?: string, userId?: string) {
  if (!invitationId || !userId) return;

  const { error } = await serviceClient
    .from("team_invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by_user_id: userId,
    })
    .eq("id", invitationId);

  if (error) throw error;
}

async function attachUserToOrganization({
  serviceClient,
  organizationId,
  userId,
  role,
  jobTitle,
  invitedBy,
  obraScope,
  modulePermissions,
  selectedObras,
  invitationId,
}: {
  serviceClient: any;
  organizationId: string;
  userId: string;
  role: string;
  jobTitle?: string | null;
  invitedBy?: string | null;
  obraScope?: string;
  modulePermissions?: any[];
  selectedObras?: string[];
  invitationId?: string;
}) {
  const { data: member, error: memberError } = await serviceClient
    .from("organization_members")
    .upsert({
      organization_id: organizationId,
      user_id: userId,
      role,
      member_status: "active",
      job_title: jobTitle || null,
      invited_by: invitedBy || null,
      obra_scope: obraScope || "all",
    }, { onConflict: "organization_id,user_id" })
    .select()
    .single();

  if (memberError) throw memberError;

  await syncMemberPermissions(serviceClient, member.id, modulePermissions);
  await syncMemberProjectAccess(serviceClient, member.id, obraScope, selectedObras);
  // NOTE: invitation stays in "pending" state until the invited user actually
  // signs in for the first time (then the client calls public.accept_my_pending_invitations).
  // Keeps the "Convites Pendentes" tab meaningful.
  void invitationId;

  return member;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the calling user
    const { data: { user: callingUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json();
    const { action, userId, email, nome, role, modulePermissions, obraScope, selectedObras, invitationId } = body;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Actions that require super admin
    const superAdminActions = ["send_password_reset", "renew_trial"];
    if (superAdminActions.includes(action)) {
      const { data: isSuperAdmin, error: adminErr } = await userClient.rpc("is_super_admin");
      if (adminErr || !isSuperAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // ─── CREATE USER ───
    if (action === "create_user") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const normalizedEmail = normalizeEmail(email);

      // Check if caller is super admin
      const { data: callerIsSuperAdmin } = await userClient.rpc("is_super_admin");

      // Require org admin/owner (or super admin) to invite users
      const { data: callerIsOrgAdmin, error: orgAdminErr } = await userClient.rpc("is_org_admin");
      if (!callerIsSuperAdmin && (orgAdminErr || !callerIsOrgAdmin)) {
        return new Response(JSON.stringify({ error: "Apenas administradores da organização podem convidar utilizadores" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Non-super-admin users can only assign limited roles
      const allowedRolesForRegularUsers = ["gestor", "fiscal", "cliente", "financeiro", "sales"];
      const requestedRole = role || "gestor";
      
      if (!callerIsSuperAdmin && !allowedRolesForRegularUsers.includes(requestedRole)) {
        return new Response(JSON.stringify({ error: "Sem permissão para atribuir esta role" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Generate a temporary random password
      const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";

      let targetUserId: string | null = null;
      let createdNewUser = false;

      // Create user via Supabase Auth Admin
      const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          nome: nome || normalizedEmail.split("@")[0],
          role: requestedRole,
          created_by: callingUser.id,
        },
      });

      if (createError) {
        if (!isEmailExistsError(createError)) {
          console.error("Create user error:", createError);
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const { data: existingProfile, error: profileLookupError } = await serviceClient
          .from("profiles")
          .select("user_id")
          .ilike("email", normalizedEmail)
          .limit(1)
          .maybeSingle();

        if (profileLookupError || !existingProfile?.user_id) {
          console.error("Existing user lookup error:", profileLookupError || createError);
          return new Response(JSON.stringify({ error: "O utilizador já existe, mas não foi possível concluir o convite." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        targetUserId = existingProfile.user_id;
      } else {
        targetUserId = newUser?.user?.id ?? null;
        createdNewUser = Boolean(targetUserId);
      }

      // Update profile role and link to creator
      if (targetUserId) {
        await serviceClient
          .from("profiles")
          .update({ 
            role: requestedRole, 
            nome: nome || normalizedEmail.split("@")[0],
            email: normalizedEmail,
          })
          .eq("user_id", targetUserId);

        // ─── ADD NEW USER TO INVITER'S ORGANIZATION ───
        // Cliente users should NOT be added to the inviter's organization
        // They only access the client portal via client_obra_access records
        if (requestedRole !== "cliente") {
          // Get the inviter's organization
          const { data: inviterOrg } = await serviceClient
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", callingUser.id)
            .limit(1)
            .maybeSingle();

          if (inviterOrg?.organization_id) {
            await attachUserToOrganization({
              serviceClient,
              organizationId: inviterOrg.organization_id,
              userId: targetUserId,
              role: requestedRole,
              jobTitle: body.job_title || null,
              invitedBy: callingUser.id,
              obraScope: obraScope || "all",
              modulePermissions,
              selectedObras,
              invitationId,
            });
            
            console.log(`User ${targetUserId} added to organization ${inviterOrg.organization_id}`);
          } else {
            const { data: existingOrg } = await serviceClient
              .from("organizations")
              .select("id")
              .eq("owner_user_id", targetUserId)
              .limit(1)
              .maybeSingle();

            const { data: newOrg } = await serviceClient
              .from("organizations")
              .upsert(existingOrg?.id ? {
                id: existingOrg.id,
                nome: (nome || normalizedEmail.split("@")[0]) + " - Empresa",
                owner_user_id: targetUserId,
              } : {
                nome: (nome || normalizedEmail.split("@")[0]) + " - Empresa",
                owner_user_id: targetUserId,
              })
              .select()
              .single();

            if (newOrg) {
              await serviceClient
                .from("organization_members")
                .upsert({
                  organization_id: newOrg.id,
                  user_id: targetUserId,
                  role: requestedRole,
                  member_status: "active",
                  job_title: body.job_title || null,
                  invited_by: callingUser.id,
                  obra_scope: obraScope || "all",
                }, { onConflict: 'organization_id,user_id' });

              await markInvitationAccepted(serviceClient, invitationId, targetUserId);
            }
          }
        } else {
          await markInvitationAccepted(serviceClient, invitationId, targetUserId);
        }
      }

      // Generate password reset link so user can set their own password
      const siteOrigin = req.headers.get("origin") || "https://app.obrasys.pt";
      const { data: resetData, error: resetError } = await serviceClient.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
        options: {
          redirectTo: `${siteOrigin}/auth/reset-password`,
        },
      });

      if (resetError) {
        console.error("Generate recovery link error:", resetError);
      }

      // Send welcome/access email via Resend
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey && resetData?.properties?.action_link) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "ObraSys <noreply@obrasys.pt>",
              to: [normalizedEmail],
              subject: "Bem-vindo ao ObraSys - Instruções de Acesso",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Bem-vindo ao ObraSys!</h2>
                  <p>Olá${nome ? ` ${nome}` : ""},</p>
                  <p>A sua conta foi criada no ObraSys. Para começar a usar a plataforma, defina a sua password clicando no botão abaixo:</p>
                  <p style="margin: 24px 0;">
                    <a href="${resetData.properties.action_link}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Definir Password e Aceder
                    </a>
                  </p>
                  <p style="color: #666; font-size: 14px;">Após definir a sua password, poderá aceder ao ObraSys em <a href="https://app.obrasys.pt">app.obrasys.pt</a></p>
                  <p style="color: #666; font-size: 14px;">Se não esperava receber este email, pode ignorá-lo.</p>
                </div>
              `,
            }),
          });
        } catch (emailErr) {
          console.error("Failed to send welcome email via Resend:", emailErr);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Utilizador ${normalizedEmail} ${createdNewUser ? "criado" : "associado"} com sucesso. Email de acesso enviado.`,
        userId: targetUserId,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ─── SEND PASSWORD RESET ───
    if (action === "send_password_reset") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const normalizedEmail = normalizeEmail(email);

      if (invitationId) {
        const [{ data: invitation, error: invitationError }, { data: existingProfile, error: profileLookupError }] = await Promise.all([
          serviceClient
            .from("team_invitations")
            .select("id, organization_id, full_name, role_code, invited_by_user_id, job_title, obra_scope")
            .eq("id", invitationId)
            .limit(1)
            .maybeSingle(),
          serviceClient
            .from("profiles")
            .select("user_id")
            .ilike("email", normalizedEmail)
            .limit(1)
            .maybeSingle(),
        ]);

        if (invitationError || profileLookupError) {
          console.error("Invitation resend lookup error:", invitationError || profileLookupError);
        }

        if (invitation && existingProfile?.user_id) {
          const { data: invitationPermissions, error: permissionsError } = await serviceClient
            .from("team_invitation_module_permissions")
            .select("module_code, can_view, can_create, can_update, can_delete")
            .eq("invitation_id", invitation.id);

          if (permissionsError) {
            console.error("Invitation permissions lookup error:", permissionsError);
            return new Response(JSON.stringify({ error: permissionsError.message }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }

          await serviceClient
            .from("profiles")
            .update({
              role: mapRoleToProfileRole(invitation.role_code),
              nome: invitation.full_name || normalizedEmail.split("@")[0],
              email: normalizedEmail,
            })
            .eq("user_id", existingProfile.user_id);

          await attachUserToOrganization({
            serviceClient,
            organizationId: invitation.organization_id,
            userId: existingProfile.user_id,
            role: mapRoleToProfileRole(invitation.role_code),
            jobTitle: invitation.job_title,
            invitedBy: invitation.invited_by_user_id,
            obraScope: invitation.obra_scope,
            modulePermissions: invitationPermissions || [],
            invitationId: invitation.id,
          });
        }
      }

      const siteOrigin2 = req.headers.get("origin") || "https://app.obrasys.pt";
      const { data, error } = await serviceClient.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
        options: {
          redirectTo: `${siteOrigin2}/auth/reset-password`,
        },
      });

      if (error) {
        console.error("Password reset error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey && data?.properties?.action_link) {
        try {
          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "ObraSys <noreply@obrasys.pt>",
              to: [normalizedEmail],
              subject: "Redefinir a sua password - ObraSys",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Redefinição de Password</h2>
                  <p>Recebeu este email porque um administrador solicitou a redefinição da sua password.</p>
                  <p>Clique no botão abaixo para definir uma nova password:</p>
                  <p style="margin: 24px 0;">
                    <a href="${data.properties.action_link}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Redefinir Password
                    </a>
                  </p>
                  <p style="color: #666; font-size: 14px;">Se não solicitou esta alteração, pode ignorar este email.</p>
                </div>
              `,
            }),
          });
          const resendData = await resendRes.json();
          console.log("Resend response:", resendData);
        } catch (emailErr) {
          console.error("Failed to send email via Resend:", emailErr);
        }
      }

      return new Response(JSON.stringify({ success: true, message: "Password reset enviado" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ─── RENEW TRIAL ───
    if (action === "renew_trial") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const newTrialEnd = new Date();
      newTrialEnd.setDate(newTrialEnd.getDate() + 30);

      const { error: updateError } = await serviceClient
        .from("profiles")
        .update({
          trial_end: newTrialEnd.toISOString(),
          trial_expired: false,
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Trial renewal error:", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      await serviceClient
        .from("subscribers")
        .update({
          subscription_end: newTrialEnd.toISOString(),
          subscription_status: "trialing",
          subscription_tier: "trial",
          subscribed: false,
        })
        .eq("user_id", userId);

      // Send trial renewal email
      const resendKeyTrial = Deno.env.get("RESEND_API_KEY");
      if (resendKeyTrial) {
        const { data: profileData } = await serviceClient
          .from("profiles")
          .select("email, nome")
          .eq("user_id", userId)
          .maybeSingle();

        if (profileData?.email) {
          const trialEndFormatted = newTrialEnd.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendKeyTrial}`,
              },
              body: JSON.stringify({
                from: "ObraSys <noreply@obrasys.pt>",
                to: [profileData.email],
                subject: "O seu trial foi renovado por mais 30 dias! 🎉",
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h1 style="color: #1a1a2e; margin: 0;">ObraSys</h1>
                    </div>
                    <h2 style="color: #1a1a2e;">Olá${profileData.nome ? `, ${profileData.nome}` : ""}! 👋</h2>
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                      Temos boas notícias! O seu período de trial no <strong>ObraSys</strong> foi renovado por mais <strong>30 dias</strong>.
                    </p>
                    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #1e40af; font-size: 15px;">
                        <strong>Nova data de expiração:</strong> ${trialEndFormatted}
                      </p>
                    </div>
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                      Continue a explorar todas as funcionalidades da plataforma. Estamos aqui para ajudar no que precisar!
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://obrasysv2.lovable.app" style="background: #3b82f6; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Aceder ao ObraSys</a>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                      © ${new Date().getFullYear()} ObraSys. Todos os direitos reservados.
                    </p>
                  </div>
                `,
              }),
            });
            console.log("Trial renewal email sent to:", profileData.email);
          } catch (emailErr) {
            console.error("Failed to send trial renewal email:", emailErr);
          }
        }
      }

      return new Response(JSON.stringify({ success: true, message: "Trial renovado por 30 dias" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("admin-user-actions error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
