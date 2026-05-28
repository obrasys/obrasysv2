import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck, Mail, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { SEO } from "@/components/SEO";

const TRUSTED_DEVICE_KEY = "obrasys_trusted_device";

export default function Verify2FA() {
  const navigate = useNavigate();
  const { user, signOut, setMfaVerified } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sent, setSent] = useState(false);

  const initRan = useRef(false);

  // On mount: try trusted-device fast path, otherwise send code
  useEffect(() => {
    if (!user || initRan.current) return;
    initRan.current = true;
    const tryTrustedOrSend = async () => {
      const storedToken = localStorage.getItem(TRUSTED_DEVICE_KEY);
      if (storedToken) {
        const { data } = await supabase.functions.invoke("verify-2fa-code", {
          body: { deviceToken: storedToken },
        });
        if (data?.verified) {
          setMfaVerified(true);
          navigate("/dashboard", { replace: true });
          return;
        }
        localStorage.removeItem(TRUSTED_DEVICE_KEY);
      }
      sendCode();
    };
    tryTrustedOrSend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const sendCode = async () => {
    setIsSending(true);
    const { data, error } = await supabase.functions.invoke("send-2fa-code");
    setIsSending(false);
    if (error || (data && data.error)) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar código",
        description: (data?.error as string) ?? error?.message ?? "Tente novamente.",
      });
      return;
    }
    setSent(true);
    setResendCooldown(60);
    toast({
      title: "Código enviado",
      description: `Verifique o email ${user?.email}`,
    });
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setIsVerifying(true);

    const deviceLabel = `${navigator.platform} • ${navigator.userAgent.substring(0, 80)}`;

    const { data, error } = await supabase.functions.invoke("verify-2fa-code", {
      body: { code, trustDevice, deviceLabel },
    });

    setIsVerifying(false);

    if (error || (data && data.error)) {
      toast({
        variant: "destructive",
        title: "Código inválido",
        description: (data?.error as string) ?? error?.message ?? "Tente novamente.",
      });
      setCode("");
      return;
    }

    if (data?.deviceToken) {
      localStorage.setItem(TRUSTED_DEVICE_KEY, data.deviceToken);
    }

    setMfaVerified(true);
    toast({ title: "Verificado", description: "Acesso liberado." });
    navigate("/dashboard", { replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEO title="Verificação em dois passos - ObraSys" description="Confirme a sua identidade com o código enviado por email." path="/verify-2fa" />
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <img src={logo} alt="ObraSys" className="h-10" />
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Verificação em dois passos</h1>
          <p className="text-sm text-muted-foreground">
            Enviámos um código de 6 dígitos para
            <br />
            <span className="font-medium text-foreground inline-flex items-center gap-1 mt-1">
              <Mail className="w-4 h-4" /> {user?.email}
            </span>
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode} disabled={isVerifying}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="trust-device"
              checked={trustDevice}
              onCheckedChange={(c) => setTrustDevice(!!c)}
            />
            <label htmlFor="trust-device" className="text-sm text-muted-foreground leading-tight cursor-pointer">
              Confiar neste dispositivo durante 30 dias
            </label>
          </div>

          <Button onClick={handleVerify} disabled={code.length !== 6 || isVerifying} className="w-full" size="lg">
            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar e entrar"}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              onClick={sendCode}
              disabled={resendCooldown > 0 || isSending}
              className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
            >
              {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
            </button>
            <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <LogOut className="w-3 h-3" /> Sair
            </button>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          O código expira em 5 minutos. Se não recebeu, verifique a pasta de spam.
        </p>
      </Card>
    </div>
  );
}
