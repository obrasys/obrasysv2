import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/patterns";
import { KeyRound, ShieldAlert, Smartphone, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function DefinicoesConta() {
  const { user, signOut } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);

  useEffect(() => {
    setLastSignIn(user?.last_sign_in_at ?? null);
  }, [user]);

  async function handlePasswordUpdate() {
    if (newPassword.length < 8) {
      toast.error("A palavra-passe deve ter no mínimo 8 caracteres.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPassword("");
    toast.success("Palavra-passe atualizada.");
  }

  async function handleSignOutAll() {
    await supabase.auth.signOut({ scope: "global" });
    await signOut();
    toast.success("Sessão terminada em todos os dispositivos.");
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Identificação" description="Email associado à conta.">
        <div className="space-y-3 max-w-md">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
          {lastSignIn ? (
            <p className="text-xs text-text-muted">
              Último início de sessão: {new Date(lastSignIn).toLocaleString("pt-PT")}
            </p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Palavra-passe"
        description="Mínimo 8 caracteres. Usa uma combinação de letras, números e símbolos."
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end max-w-xl">
          <div className="flex-1 space-y-2">
            <Label>Nova palavra-passe</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button onClick={handlePasswordUpdate} disabled={saving || !newPassword}>
            <KeyRound className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Autenticação em dois fatores"
        description="Camada extra de segurança ao iniciar sessão."
      >
        <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-sunken/40 p-4">
          <ShieldAlert className="h-5 w-5 text-[hsl(var(--warning))]" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-strong">2FA por TOTP</p>
            <p className="text-xs text-text-muted">
              Em breve poderás configurar autenticação de dois fatores diretamente daqui.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Sessões e dispositivos"
        description="Termina sessão em todos os dispositivos onde a conta esteja ativa."
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <Smartphone className="h-4 w-4" />
            Sessão atual neste navegador.
          </div>
          <Button variant="outline" onClick={handleSignOutAll}>
            <LogOut className="mr-2 h-4 w-4" /> Terminar todas as sessões
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
