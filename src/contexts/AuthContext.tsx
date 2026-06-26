import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  empresa: string | null;
  nif: string | null;
  avatar_url: string | null;
  role: "admin" | "gestor" | "fiscal" | "cliente" | "financeiro" | "sales" | "supplier";
  trial_start: string;
  trial_end: string;
  trial_expired: boolean;
  // Company fields
  empresa_nome: string | null;
  empresa_nif: string | null;
  empresa_morada: string | null;
  empresa_cidade: string | null;
  empresa_codigo_postal: string | null;
  empresa_pais: string | null;
  empresa_telefone: string | null;
  empresa_email: string | null;
  empresa_logo_url: string | null;
}

interface OrganizationInfo {
  id: string;
  nome: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: OrganizationInfo | null;
  loading: boolean;
  signUp: (email: string, password: string, nome: string, extra?: { telefone?: string; empresa?: string; nif?: string }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  trialDaysRemaining: number;
  mfaVerified: boolean;
  setMfaVerified: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaVerified, setMfaVerifiedState] = useState<boolean>(false);

  const setMfaVerified = (v: boolean) => setMfaVerifiedState(v);

  const refreshMfaStatus = async (uid?: string | null) => {
    if (!uid) {
      setMfaVerifiedState(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc("mfa_is_verified");
      if (error) {
        setMfaVerifiedState(false);
        return;
      }
      setMfaVerifiedState(!!data);
    } catch {
      setMfaVerifiedState(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      setProfile(data as Profile);

      // Fetch organization membership
      const { data: orgData } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(id, nome)")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (orgData && orgData.organizations) {
        const org = orgData.organizations as any;
        setOrganization({
          id: org.id,
          nome: org.nome,
          role: orgData.role,
        });
      } else {
        setOrganization(null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let profileUserId: string | null = null;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === "SIGNED_OUT") {
          profileUserId = null;
          setProfile(null);
          setOrganization(null);
          return;
        }

        // Only fetch profile if user actually changed (prevents refresh token loops)
        if (session?.user && session.user.id !== profileUserId) {
          profileUserId = session.user.id;
          setTimeout(() => {
            fetchProfile(session.user.id);
            // Mark any pending team invitations for this user's email as accepted
            // (deferred so it never blocks the auth flow).
            void (supabase.rpc as any)('accept_my_pending_invitations').then(() => {}, () => {});
          }, 0);
        } else if (!session?.user) {
          profileUserId = null;
          setProfile(null);
          setOrganization(null);
        }
      }
    );

    // THEN check for existing session and await profile before releasing loading
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      try {
        if (session?.user) {
          profileUserId = session.user.id;
          await fetchProfile(session.user.id);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, nome: string, extra?: { telefone?: string; empresa?: string; nif?: string }) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome,
            ...(extra || {}),
          },
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setOrganization(null);
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Calculate trial days remaining
  const trialDaysRemaining = profile?.trial_end
    ? Math.max(0, Math.ceil((new Date(profile.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        organization,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile,
        trialDaysRemaining,
        mfaVerified,
        setMfaVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
