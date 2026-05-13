import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { newPasswordSchema, NewPasswordFormData } from "@/lib/validations/auth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { SEO } from "@/components/SEO";

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const { toast } = useToast();

  const form = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    // Listen for password recovery event FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("ResetPassword auth event:", event);
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setIsValidToken(true);
        setCheckingToken(false);
      }
    });

    // Then check for existing session (may already be established)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidToken(true);
      }
      setCheckingToken(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (data: NewPasswordFormData) => {
    setIsLoading(true);
    
    // Ensure we have a valid session before attempting update
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Sessão expirada",
        description: "O link de recuperação expirou. Por favor, solicite um novo link.",
      });
      return;
    }

    const { error } = await updatePassword(data.password);
    setIsLoading(false);

    if (error) {
      console.error("Password update error:", error.message, error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível atualizar a password. Tente novamente.",
      });
      return;
    }

    setIsSuccess(true);
    toast({
      title: "Password atualizada!",
      description: "A sua password foi atualizada com sucesso.",
    });
  };

  if (checkingToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isValidToken && !checkingToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center space-y-6">
          <a href="/" className="flex items-center justify-center mb-8">
            <img
              src={logo}
              alt="ObraSys Logo"
              className="h-12 w-auto"
            />
          </a>

          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Link inválido ou expirado
            </h2>
            <p className="text-muted-foreground">
              Este link de recuperação de password é inválido ou já expirou. 
              Por favor, solicite um novo link.
            </p>
          </div>

          <Button
            variant="accent"
            className="w-full"
            size="lg"
            onClick={() => navigate("/auth")}
          >
            Voltar ao login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <SEO
        title="Redefinir palavra-passe — ObraSys"
        description="Defina uma nova palavra-passe segura para a sua conta ObraSys."
        path="/auth/reset-password"
        noindex
      />
      <div className="w-full max-w-md">
        <a href="/" className="flex items-center justify-center mb-8">
          <img
            src={logo}
            alt="ObraSys Logo"
            className="h-12 w-auto"
          />
        </a>

        {!isSuccess ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Nova password
              </h2>
              <p className="text-muted-foreground">
                Introduza a sua nova password
              </p>
            </div>

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...form.register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button type="submit" variant="accent" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Atualizar password"}
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Password atualizada!
              </h2>
              <p className="text-muted-foreground">
                A sua password foi atualizada com sucesso. Pode agora fazer login com a nova password.
              </p>
            </div>
            <Button
              variant="accent"
              className="w-full"
              size="lg"
              onClick={() => navigate("/auth")}
            >
              Ir para o login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
